
export class SerialService {
  private port: any | null = null;
  private reader: any | null = null;
  private writer: any | null = null;

  async requestPort() {
    try {
      // @ts-ignore
      this.port = await navigator.serial.requestPort();
      await this.port.open({ baudRate: 115200 });
      this.writer = this.port.writable.getWriter();
      return true;
    } catch (err) {
      console.error('Serial connection failed:', err);
      return false;
    }
  }

  async disconnect() {
    if (this.reader) {
      await this.reader.cancel();
      this.reader = null;
    }
    if (this.writer) {
      this.writer.releaseLock();
      this.writer = null;
    }
    if (this.port) {
      await this.port.close();
      this.port = null;
    }
  }

  async sendCommand(command: string) {
    if (!this.writer) throw new Error('Not connected to dice');
    const encoder = new TextEncoder();
    await this.writer.write(encoder.encode(command + '\r\n'));
  }

  async flashFile(filename: string, content: string) {
    if (!this.writer) throw new Error('Not connected to dice');
    
    // Simple MicroPython-style file write protocol
    // This is a simplified version. Real implementation might need flow control.
    await this.sendCommand(`f = open('${filename}', 'w')`);
    
    // Split content into chunks to avoid buffer overflow
    const chunks = content.match(/.{1,64}/gs) || [content];
    for (const chunk of chunks) {
      const escaped = chunk.replace(/'/g, "\\'").replace(/\n/g, '\\n');
      await this.sendCommand(`f.write('${escaped}')`);
    }
    
    await this.sendCommand('f.close()');
    await this.sendCommand('import machine; machine.reset()');
  }

  isConnected() {
    return !!this.port;
  }
}

export const serialService = new SerialService();
