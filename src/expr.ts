import { Instruction, Op, Operand, Program } from "./ir";

type TokenType = "num" | "ident" | "op" | "eof";

interface Token {
  type: TokenType;
  text: string;
  pos: number;
  value?: number;
}

type Ast =
  | { kind: "var" }
  | { kind: "lit"; value: number }
  | { kind: "unary"; op: "not" | "neg"; arg: Ast }
  | { kind: "binary"; op: Op; left: Ast; right: Ast }
  | { kind: "ashr"; left: Ast; right: Ast };

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < source.length) {
    const c = source[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (/[0-9]/.test(c)) {
      const start = i;
      if (c === "0" && (source[i + 1] === "x" || source[i + 1] === "X")) {
        i += 2;
        const hexStart = i;
        while (i < source.length && /[0-9a-fA-F]/.test(source[i])) i++;
        const text = source.slice(start, i);
        if (i === hexStart) throw new Error(`invalid hex literal '${text}' at position ${start}`);
        tokens.push({ type: "num", text, pos: start, value: parseInt(text.slice(2), 16) });
      } else {
        while (i < source.length && /[0-9]/.test(source[i])) i++;
        const text = source.slice(start, i);
        tokens.push({ type: "num", text, pos: start, value: parseInt(text, 10) });
      }
      continue;
    }
    if (/[a-zA-Z_]/.test(c)) {
      const start = i;
      while (i < source.length && /[a-zA-Z0-9_]/.test(source[i])) i++;
      tokens.push({ type: "ident", text: source.slice(start, i), pos: start });
      continue;
    }
    if (c === "<" && source[i + 1] === "<") {
      tokens.push({ type: "op", text: "<<", pos: i });
      i += 2;
      continue;
    }
    if (c === ">" && source[i + 1] === ">") {
      tokens.push({ type: "op", text: ">>", pos: i });
      i += 2;
      continue;
    }
    if ("()+-*&^|~,".includes(c)) {
      tokens.push({ type: "op", text: c, pos: i });
      i++;
      continue;
    }
    throw new Error(`unexpected character '${c}' at position ${i}`);
  }
  tokens.push({ type: "eof", text: "", pos: source.length });
  return tokens;
}

function parse(tokens: Token[]): Ast {
  let pos = 0;
  const peek = (): Token => tokens[pos];
  const advance = (): Token => tokens[pos++];

  function unexpected(token: Token): never {
    if (token.type === "eof") throw new Error("unexpected end of input");
    throw new Error(`unexpected token '${token.text}' at position ${token.pos}`);
  }

  function expectOp(text: string): void {
    const token = peek();
    if (token.type === "op" && token.text === text) {
      advance();
      return;
    }
    unexpected(token);
  }

  function parseOr(): Ast {
    let left = parseXor();
    while (peek().type === "op" && peek().text === "|") {
      advance();
      left = { kind: "binary", op: "or", left, right: parseXor() };
    }
    return left;
  }

  function parseXor(): Ast {
    let left = parseAnd();
    while (peek().type === "op" && peek().text === "^") {
      advance();
      left = { kind: "binary", op: "xor", left, right: parseAnd() };
    }
    return left;
  }

  function parseAnd(): Ast {
    let left = parseShift();
    while (peek().type === "op" && peek().text === "&") {
      advance();
      left = { kind: "binary", op: "and", left, right: parseShift() };
    }
    return left;
  }

  function parseShift(): Ast {
    let left = parseAdd();
    while (peek().type === "op" && (peek().text === "<<" || peek().text === ">>")) {
      const opToken = advance();
      const op: Op = opToken.text === "<<" ? "shl" : "lshr";
      left = { kind: "binary", op, left, right: parseAdd() };
    }
    return left;
  }

  function parseAdd(): Ast {
    let left = parseMul();
    while (peek().type === "op" && (peek().text === "+" || peek().text === "-")) {
      const opToken = advance();
      const op: Op = opToken.text === "+" ? "add" : "sub";
      left = { kind: "binary", op, left, right: parseMul() };
    }
    return left;
  }

  function parseMul(): Ast {
    let left = parseUnary();
    while (peek().type === "op" && peek().text === "*") {
      advance();
      left = { kind: "binary", op: "mul", left, right: parseUnary() };
    }
    return left;
  }

  function parseUnary(): Ast {
    const token = peek();
    if (token.type === "op" && token.text === "~") {
      advance();
      return { kind: "unary", op: "not", arg: parseUnary() };
    }
    if (token.type === "op" && token.text === "-") {
      advance();
      return { kind: "unary", op: "neg", arg: parseUnary() };
    }
    return parsePrimary();
  }

  function parsePrimary(): Ast {
    const token = peek();
    if (token.type === "num") {
      advance();
      return { kind: "lit", value: token.value as number };
    }
    if (token.type === "ident") {
      if (token.text === "x") {
        advance();
        return { kind: "var" };
      }
      if (token.text === "ashr") {
        advance();
        expectOp("(");
        const left = parseOr();
        const commaToken = peek();
        if (!(commaToken.type === "op" && commaToken.text === ",")) unexpected(commaToken);
        advance();
        const right = parseOr();
        expectOp(")");
        return { kind: "ashr", left, right };
      }
      throw new Error(`unknown identifier '${token.text}' at position ${token.pos}`);
    }
    if (token.type === "op" && token.text === "(") {
      advance();
      const inner = parseOr();
      expectOp(")");
      return inner;
    }
    unexpected(token);
  }

  const ast = parseOr();
  const trailing = peek();
  if (trailing.type !== "eof") unexpected(trailing);
  return ast;
}

function widthMask(width: number): number {
  return width >= 32 ? 0xffffffff : (1 << width) - 1;
}

function flatten(ast: Ast, mask: number, instructions: Instruction[]): Operand {
  if (ast.kind === "var") return { kind: "input", index: 0 };
  if (ast.kind === "lit") return { kind: "const", value: (ast.value & mask) >>> 0 };
  if (ast.kind === "unary") {
    const arg = flatten(ast.arg, mask, instructions);
    instructions.push({ op: ast.op, operands: [arg] });
    return { kind: "result", index: instructions.length - 1 };
  }
  const op: Op = ast.kind === "ashr" ? "ashr" : ast.op;
  const left = flatten(ast.left, mask, instructions);
  const right = flatten(ast.right, mask, instructions);
  instructions.push({ op, operands: [left, right] });
  return { kind: "result", index: instructions.length - 1 };
}

export function parseExpr(source: string, width: number): Program {
  const ast = parse(tokenize(source));
  const mask = widthMask(width);
  const instructions: Instruction[] = [];
  const output = flatten(ast, mask, instructions);
  return { width, instructions, output };
}
