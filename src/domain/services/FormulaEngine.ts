/**
 * FormulaEngine — 급여 산식 평가 엔진.
 *
 * Tokenizer → Parser → Evaluator 3단계 파이프라인 (eval() 금지, 순수 TypeScript).
 *
 * 지원:
 * - 사칙연산: +, -, *, /
 * - 한글/영문 변수: 통상시급, 연장근로분 등
 * - 내장 함수 8종: floor, round, min, max, truncate1, truncate10, clamp, taxLookup
 * - 괄호, 단항 마이너스
 *
 * 사용법:
 *   FormulaEngine.validate("floor(통상시급 * 1.5 * 연장근로분 / 60)")
 *   FormulaEngine.evaluate("floor(통상시급 * 1.5 * 연장근로분 / 60)", context)
 *   FormulaEngine.extractVariables("floor(통상시급 * 1.5)")  // ['통상시급']
 */

// ─── Token Types ───────────────────────────────────────────────

export type TokenType =
  | 'NUMBER'
  | 'VARIABLE'
  | 'OPERATOR'
  | 'LPAREN'
  | 'RPAREN'
  | 'COMMA'
  | 'FUNCTION'
  | 'EOF';

export interface Token {
  type: TokenType;
  value: string;
  position: number;
}

// ─── AST Node Types ────────────────────────────────────────────

export type ASTNode =
  | NumberLiteral
  | VariableLookup
  | BinaryExpr
  | UnaryExpr
  | FunctionCall;

export interface NumberLiteral {
  kind: 'NumberLiteral';
  value: number;
}

export interface VariableLookup {
  kind: 'VariableLookup';
  name: string;
}

export interface BinaryExpr {
  kind: 'BinaryExpr';
  operator: '+' | '-' | '*' | '/';
  left: ASTNode;
  right: ASTNode;
}

export interface UnaryExpr {
  kind: 'UnaryExpr';
  operator: '-';
  operand: ASTNode;
}

export interface FunctionCall {
  kind: 'FunctionCall';
  name: string;
  args: ASTNode[];
}

// ─── Built-in Functions ────────────────────────────────────────

const BUILTIN_FUNCTIONS = new Set([
  'floor', 'round', 'min', 'max',
  'truncate1', 'truncate10',
  'clamp', 'taxLookup',
]);

// ─── Validation Result ─────────────────────────────────────────

export interface FormulaValidationResult {
  valid: boolean;
  error?: string;
  variables: string[];
}

// ─── Context for evaluation ────────────────────────────────────

/** TaxBracket lookup table injected via context key `__taxBrackets__` */
export interface TaxBracketForFormula {
  minIncome: number;
  maxIncome: number;
  dependents: number;
  taxAmount: number;
}

/** Context for formula evaluation — variables map to numbers, plus optional tax brackets */
export interface FormulaContext {
  [key: string]: number | undefined | TaxBracketForFormula[];
}

/** Alias — same type, used when tax brackets are expected */
export type FormulaContextWithTax = FormulaContext;

// ─── Tokenizer ─────────────────────────────────────────────────

function tokenize(formula: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < formula.length) {
    const ch = formula[i];

    // Skip whitespace
    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    // Numbers (integers and decimals)
    if (/[0-9]/.test(ch)) {
      const start = i;
      while (i < formula.length && /[0-9.]/.test(formula[i])) {
        i++;
      }
      const numStr = formula.slice(start, i);
      if (isNaN(Number(numStr))) {
        throw new FormulaError(`잘못된 숫자: ${numStr}`, start);
      }
      tokens.push({ type: 'NUMBER', value: numStr, position: start });
      continue;
    }

    // Identifiers: 한글, 영문, 숫자, 밑줄 (첫 글자는 한글/영문/밑줄)
    if (/[a-zA-Z가-힣_]/.test(ch)) {
      const start = i;
      while (i < formula.length && /[a-zA-Z0-9가-힣_]/.test(formula[i])) {
        i++;
      }
      const name = formula.slice(start, i);

      if (BUILTIN_FUNCTIONS.has(name)) {
        tokens.push({ type: 'FUNCTION', value: name, position: start });
      } else {
        tokens.push({ type: 'VARIABLE', value: name, position: start });
      }
      continue;
    }

    // Operators
    if ('+-*/'.includes(ch)) {
      tokens.push({ type: 'OPERATOR', value: ch, position: i });
      i++;
      continue;
    }

    // Parentheses
    if (ch === '(') {
      tokens.push({ type: 'LPAREN', value: '(', position: i });
      i++;
      continue;
    }
    if (ch === ')') {
      tokens.push({ type: 'RPAREN', value: ')', position: i });
      i++;
      continue;
    }

    // Comma
    if (ch === ',') {
      tokens.push({ type: 'COMMA', value: ',', position: i });
      i++;
      continue;
    }

    throw new FormulaError(`알 수 없는 문자: '${ch}'`, i);
  }

  tokens.push({ type: 'EOF', value: '', position: i });
  return tokens;
}

// ─── Parser (Recursive Descent) ────────────────────────────────

class Parser {
  private tokens: Token[];
  private pos: number;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
    this.pos = 0;
  }

  private peek(): Token {
    return this.tokens[this.pos];
  }

  private advance(): Token {
    const token = this.tokens[this.pos];
    this.pos++;
    return token;
  }

  private expect(type: TokenType): Token {
    const token = this.peek();
    if (token.type !== type) {
      throw new FormulaError(
        `예상: ${type}, 실제: ${token.type} ('${token.value}')`,
        token.position,
      );
    }
    return this.advance();
  }

  parse(): ASTNode {
    const node = this.parseExpression();
    if (this.peek().type !== 'EOF') {
      const t = this.peek();
      throw new FormulaError(`예상치 못한 토큰: '${t.value}'`, t.position);
    }
    return node;
  }

  // expression := term (('+' | '-') term)*
  private parseExpression(): ASTNode {
    let left = this.parseTerm();

    while (
      this.peek().type === 'OPERATOR' &&
      (this.peek().value === '+' || this.peek().value === '-')
    ) {
      const op = this.advance().value as '+' | '-';
      const right = this.parseTerm();
      left = { kind: 'BinaryExpr', operator: op, left, right };
    }

    return left;
  }

  // term := unary (('*' | '/') unary)*
  private parseTerm(): ASTNode {
    let left = this.parseUnary();

    while (
      this.peek().type === 'OPERATOR' &&
      (this.peek().value === '*' || this.peek().value === '/')
    ) {
      const op = this.advance().value as '*' | '/';
      const right = this.parseUnary();
      left = { kind: 'BinaryExpr', operator: op, left, right };
    }

    return left;
  }

  // unary := '-' unary | primary
  private parseUnary(): ASTNode {
    if (
      this.peek().type === 'OPERATOR' &&
      this.peek().value === '-'
    ) {
      this.advance();
      const operand = this.parseUnary();
      return { kind: 'UnaryExpr', operator: '-', operand };
    }
    return this.parsePrimary();
  }

  // primary := NUMBER | FUNCTION '(' argList ')' | VARIABLE | '(' expression ')'
  private parsePrimary(): ASTNode {
    const token = this.peek();

    // Number
    if (token.type === 'NUMBER') {
      this.advance();
      return { kind: 'NumberLiteral', value: Number(token.value) };
    }

    // Function call
    if (token.type === 'FUNCTION') {
      this.advance();
      this.expect('LPAREN');
      const args = this.parseArgList();
      this.expect('RPAREN');
      return { kind: 'FunctionCall', name: token.value, args };
    }

    // Variable
    if (token.type === 'VARIABLE') {
      this.advance();
      return { kind: 'VariableLookup', name: token.value };
    }

    // Parenthesized expression
    if (token.type === 'LPAREN') {
      this.advance();
      const expr = this.parseExpression();
      this.expect('RPAREN');
      return expr;
    }

    throw new FormulaError(
      `예상치 못한 토큰: '${token.value}'`,
      token.position,
    );
  }

  // argList := expression (',' expression)*  | empty
  private parseArgList(): ASTNode[] {
    const args: ASTNode[] = [];
    if (this.peek().type === 'RPAREN') {
      return args;
    }
    args.push(this.parseExpression());
    while (this.peek().type === 'COMMA') {
      this.advance();
      args.push(this.parseExpression());
    }
    return args;
  }
}

// ─── Evaluator ─────────────────────────────────────────────────

function evaluateAST(node: ASTNode, context: FormulaContextWithTax): number {
  switch (node.kind) {
    case 'NumberLiteral':
      return node.value;

    case 'VariableLookup': {
      const val = context[node.name];
      if (val === undefined) {
        throw new FormulaError(`정의되지 않은 변수: '${node.name}'`, 0);
      }
      if (typeof val !== 'number') {
        throw new FormulaError(`변수 '${node.name}'은(는) 숫자가 아닙니다`, 0);
      }
      return val;
    }

    case 'BinaryExpr': {
      const left = evaluateAST(node.left, context);
      const right = evaluateAST(node.right, context);
      switch (node.operator) {
        case '+': return left + right;
        case '-': return left - right;
        case '*': return left * right;
        case '/': {
          if (right === 0) throw new FormulaError('0으로 나눌 수 없습니다', 0);
          return left / right;
        }
      }
      break;
    }

    case 'UnaryExpr':
      return -evaluateAST(node.operand, context);

    case 'FunctionCall':
      return evaluateFunction(node.name, node.args, context);
  }

  throw new FormulaError('알 수 없는 AST 노드', 0);
}

function evaluateFunction(
  name: string,
  argNodes: ASTNode[],
  context: FormulaContextWithTax,
): number {
  const args = argNodes.map((a) => evaluateAST(a, context));

  switch (name) {
    case 'floor':
      if (args.length !== 1) throw new FormulaError('floor()는 인수 1개 필요', 0);
      return Math.floor(args[0]);

    case 'round':
      if (args.length !== 1) throw new FormulaError('round()는 인수 1개 필요', 0);
      return Math.round(args[0]);

    case 'min':
      if (args.length < 2) throw new FormulaError('min()는 인수 2개 이상 필요', 0);
      return Math.min(...args);

    case 'max':
      if (args.length < 2) throw new FormulaError('max()는 인수 2개 이상 필요', 0);
      return Math.max(...args);

    case 'truncate1':
      // 1원 미만 절사
      if (args.length !== 1) throw new FormulaError('truncate1()는 인수 1개 필요', 0);
      return Math.floor(args[0]);

    case 'truncate10':
      // 10원 미만 절사
      if (args.length !== 1) throw new FormulaError('truncate10()는 인수 1개 필요', 0);
      return Math.floor(args[0] / 10) * 10;

    case 'clamp':
      // clamp(value, min, max)
      if (args.length !== 3) throw new FormulaError('clamp()는 인수 3개 필요 (값, 하한, 상한)', 0);
      return Math.min(Math.max(args[0], args[1]), args[2]);

    case 'taxLookup':
      // taxLookup(taxableIncome, dependents) — 간이세액표 조회
      if (args.length !== 2) throw new FormulaError('taxLookup()는 인수 2개 필요 (과세소득, 부양가족수)', 0);
      return taxLookup(args[0], args[1], context.__taxBrackets__ as TaxBracketForFormula[] | undefined);

    default:
      throw new FormulaError(`알 수 없는 함수: '${name}'`, 0);
  }
}

function taxLookup(
  taxableIncome: number,
  dependents: number,
  brackets?: TaxBracketForFormula[],
): number {
  if (!brackets || brackets.length === 0) {
    throw new FormulaError('taxLookup(): 간이세액표 데이터가 없습니다', 0);
  }

  if (taxableIncome <= 0) return 0;

  const depInt = Math.floor(dependents);
  const bracket = brackets.find(
    (b) =>
      taxableIncome >= b.minIncome &&
      taxableIncome < b.maxIncome &&
      b.dependents === depInt,
  );

  // Fallback: find highest dependents count that doesn't exceed
  if (!bracket) {
    const fallback = brackets
      .filter(
        (b) =>
          taxableIncome >= b.minIncome &&
          taxableIncome < b.maxIncome &&
          b.dependents <= depInt,
      )
      .sort((a, b) => b.dependents - a.dependents)[0];
    return fallback?.taxAmount ?? 0;
  }

  return bracket.taxAmount;
}

// ─── Variable Extractor ────────────────────────────────────────

function extractVariablesFromAST(node: ASTNode): string[] {
  const vars = new Set<string>();

  function walk(n: ASTNode): void {
    switch (n.kind) {
      case 'VariableLookup':
        vars.add(n.name);
        break;
      case 'BinaryExpr':
        walk(n.left);
        walk(n.right);
        break;
      case 'UnaryExpr':
        walk(n.operand);
        break;
      case 'FunctionCall':
        n.args.forEach(walk);
        break;
      case 'NumberLiteral':
        break;
    }
  }

  walk(node);
  return Array.from(vars);
}

// ─── Custom Error ──────────────────────────────────────────────

export class FormulaError extends Error {
  readonly position: number;

  constructor(message: string, position: number) {
    super(message);
    this.name = 'FormulaError';
    this.position = position;
  }
}

// ─── Public API ────────────────────────────────────────────────

export class FormulaEngine {
  /**
   * Validate a formula string.
   * Returns { valid, error?, variables[] }
   */
  static validate(formula: string): FormulaValidationResult {
    try {
      if (!formula || formula.trim().length === 0) {
        return { valid: false, error: '수식이 비어 있습니다', variables: [] };
      }
      const tokens = tokenize(formula);
      const ast = new Parser(tokens).parse();
      const variables = extractVariablesFromAST(ast);
      return { valid: true, variables };
    } catch (error) {
      const msg = error instanceof FormulaError
        ? error.message
        : '알 수 없는 수식 오류';
      return { valid: false, error: msg, variables: [] };
    }
  }

  /**
   * Evaluate a formula with the given variable context.
   * Throws FormulaError on invalid formula or missing variables.
   */
  static evaluate(formula: string, context: FormulaContextWithTax): number {
    const tokens = tokenize(formula);
    const ast = new Parser(tokens).parse();
    return evaluateAST(ast, context);
  }

  /**
   * Extract variable names from a formula.
   */
  static extractVariables(formula: string): string[] {
    try {
      const tokens = tokenize(formula);
      const ast = new Parser(tokens).parse();
      return extractVariablesFromAST(ast);
    } catch {
      return [];
    }
  }

  /**
   * Parse a formula into an AST (for advanced usage/testing).
   */
  static parse(formula: string): ASTNode {
    const tokens = tokenize(formula);
    return new Parser(tokens).parse();
  }
}
