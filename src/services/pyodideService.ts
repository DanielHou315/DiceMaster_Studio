export type SimStatus = "loading" | "ready" | "running" | "stopped" | "error";

export type ScreenMessage = {
  type: "screen.set_text" | "screen.set_image" | "screen.set_gif";
  screen_id: number;
  path: string;
};

export type LogMessage = { type: "log"; message: string };
export type StatusMessage = { type: "status"; status: SimStatus };
export type ErrorMessage = { type: "error"; message: string };

export type WorkerMessage =
  | ScreenMessage
  | LogMessage
  | StatusMessage
  | ErrorMessage;

class PyodideService {
  private worker: Worker | null = null;
  private handlers = new Set<(msg: WorkerMessage) => void>();
  private _status: SimStatus = "stopped";

  get status(): SimStatus {
    return this._status;
  }

  init(): void {
    this.worker = new Worker("/pyodide-worker.js");
    this.worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
      const msg = e.data;
      if (msg.type === "status") {
        this._status = msg.status;
      }
      for (const handler of this.handlers) {
        handler(msg);
      }
    };
    this.worker.postMessage({ type: "init" });
    this._status = "loading";
  }

  onMessage(handler: (msg: WorkerMessage) => void): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  run(code: string): void {
    this.worker?.postMessage({ type: "run", code });
  }

  stop(): void {
    this.worker?.postMessage({ type: "stop" });
  }

  shake(intensity = 0.7): void {
    this.worker?.postMessage({ type: "motion.shake", intensity });
  }

  setOrientation(top: number, bottom: number): void {
    this.worker?.postMessage({ type: "orientation.change", top, bottom });
  }

  destroy(): void {
    this.worker?.terminate();
    this.worker = null;
    this.handlers.clear();
    this._status = "stopped";
  }
}

export const pyodideService = new PyodideService();
