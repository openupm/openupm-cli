import { Stream } from "./mock-console";

declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveLineIncluding(stream: Stream, text: string): R;
    }
  }
}

export {};
