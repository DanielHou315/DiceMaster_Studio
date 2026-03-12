export type SimStatus = "loading" | "ready" | "running" | "stopped" | "error";

/** Mirrors hardware TextEntry from TextGroup JSON */
export interface TextEntry {
  x?: number;         // x_cursor (0-479), default 0
  y?: number;         // y_cursor (0-479), default 0
  x_cursor?: number;  // alias
  y_cursor?: number;  // alias
  font_id?: number;   // 0-5
  font_name?: string; // "tf"|"arabic"|"chinese"|"cyrillic"|"devanagari"
  font_color?: string | number; // RGB565 hex "0xFFFF" or int
  text?: string;
}

export type ScreenMessage = {
  type: "screen.set_text" | "screen.set_image" | "screen.set_gif";
  screen_id: number;
  path: string;
  texts?: TextEntry[];         // Structured text entries from TextGroup JSON
  bg_color?: string | number;  // Background color RGB565
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

  mountAssets(files: Map<string, Uint8Array>): void {
    // Convert to transferable ArrayBuffers
    const entries: [string, ArrayBuffer][] = [];
    const transfers: ArrayBuffer[] = [];
    for (const [path, data] of files) {
      const buf = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
      entries.push([path, buf]);
      transfers.push(buf);
    }
    this.worker?.postMessage({ type: "mountAssets", files: entries }, transfers);
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
