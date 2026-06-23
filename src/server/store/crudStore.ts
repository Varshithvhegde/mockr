/**
 * In-memory CRUD store for stateful mock responses.
 * Keyed by collection base path (e.g. /api/users).
 */
export class CrudStore {
  private collections = new Map<string, Map<string, Record<string, unknown>>>();

  private getCollection(basePath: string): Map<string, Record<string, unknown>> {
    if (!this.collections.has(basePath)) {
      this.collections.set(basePath, new Map());
    }
    return this.collections.get(basePath)!;
  }

  list(basePath: string): Record<string, unknown>[] {
    return Array.from(this.getCollection(basePath).values());
  }

  get(basePath: string, id: string): Record<string, unknown> | undefined {
    return this.getCollection(basePath).get(id);
  }

  create(basePath: string, item: Record<string, unknown>): Record<string, unknown> {
    const id = String(item.id ?? item._id ?? item.uuid ?? '');
    const col = this.getCollection(basePath);
    col.set(id, item);
    return item;
  }

  update(basePath: string, id: string, data: Record<string, unknown>, partial: boolean): Record<string, unknown> | undefined {
    const col = this.getCollection(basePath);
    const existing = col.get(id);
    if (!existing) return undefined;
    const updated = partial ? { ...existing, ...data } : { ...data, id };
    col.set(id, updated);
    return updated;
  }

  delete(basePath: string, id: string): boolean {
    return this.getCollection(basePath).delete(id);
  }

  seed(basePath: string, items: Record<string, unknown>[]): void {
    const col = this.getCollection(basePath);
    for (const item of items) {
      const id = String(item.id ?? item._id ?? item.uuid ?? '');
      if (id) col.set(id, item);
    }
  }

  isEmpty(basePath: string): boolean {
    return this.getCollection(basePath).size === 0;
  }

  clear(): void {
    this.collections.clear();
  }
}
