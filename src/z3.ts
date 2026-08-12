import { init } from "z3-solver";

let context: any;

export async function getContext(): Promise<any> {
  if (!context) {
    const { Context } = await init();
    context = Context("main");
  }
  return context;
}
