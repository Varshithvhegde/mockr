import { Request, Response } from 'express';
import { faker } from '@faker-js/faker';
import { NormalisedRoute, JSONSchema } from '../../spec/types';
import { generateFromSchema } from '../../faker/generator';
import { CrudStore } from '../store/crudStore';

const SEED_COUNT = 4;

function getItemSchema(schema: JSONSchema): JSONSchema {
  // If the response schema is an array, the item schema is under .items
  if ((schema.type === 'array' || schema.items) && schema.items) {
    return schema.items as JSONSchema;
  }
  // If it's an envelope object, look for the array property
  const props = schema.properties as Record<string, JSONSchema> | undefined;
  if (props) {
    for (const [key, val] of Object.entries(props)) {
      const v = val as JSONSchema;
      if (v.type === 'array' || v.items) {
        return (v.items as JSONSchema) ?? {};
      }
    }
  }
  return schema;
}

function extractId(item: Record<string, unknown>): string {
  return String(item.id ?? item._id ?? item.uuid ?? faker.string.uuid());
}

function ensureId(item: Record<string, unknown>): Record<string, unknown> {
  if (!item.id && !item._id && !item.uuid) {
    return { ...item, id: faker.string.uuid() };
  }
  return item;
}

function seedCollection(store: CrudStore, basePath: string, itemSchema: JSONSchema): void {
  if (!store.isEmpty(basePath)) return;
  const items: Record<string, unknown>[] = [];
  for (let i = 0; i < SEED_COUNT; i++) {
    const generated = generateFromSchema(itemSchema) as Record<string, unknown>;
    const withId = ensureId(generated);
    items.push(withId);
  }
  store.seed(basePath, items);
}

export function createCrudHandler(
  route: NormalisedRoute,
  store: CrudStore,
  basePath: string
) {
  const itemSchema = getItemSchema(route.responseSchema);

  return async (req: Request, res: Response): Promise<void> => {
    const method = route.method;

    // GET collection (list)
    if (method === 'get' && route.pathParams.length === 0) {
      seedCollection(store, basePath, itemSchema);
      const items = store.list(basePath);
      // Handle pagination
      const page   = parseInt(String(req.query.page  ?? '1'));
      const limit  = parseInt(String(req.query.limit ?? req.query.per_page ?? '20'));
      const offset = parseInt(String(req.query.offset ?? (page - 1) * limit));
      const paged  = items.slice(offset, offset + limit);
      res.status(200).json(paged);
      return;
    }

    // GET single /:id
    if (method === 'get' && route.pathParams.length > 0) {
      const idParam = route.pathParams[route.pathParams.length - 1].name;
      const id      = req.params[idParam];
      seedCollection(store, basePath, itemSchema);
      const item = store.get(basePath, id);
      if (!item) {
        res.status(404).json({ error: 'not_found', message: `Resource with id '${id}' not found` });
        return;
      }
      res.status(200).json(item);
      return;
    }

    // POST — create
    if (method === 'post') {
      const body   = (req.body && Object.keys(req.body).length > 0) ? req.body : {};
      const base   = generateFromSchema(itemSchema) as Record<string, unknown>;
      const merged = ensureId({ ...base, ...body });
      store.create(basePath, merged);
      res.status(route.statusCode === 201 ? 201 : 200).json(merged);
      return;
    }

    // PUT — replace
    if (method === 'put') {
      const idParam = route.pathParams[route.pathParams.length - 1].name;
      const id      = req.params[idParam];
      const body    = req.body ?? {};
      const updated = store.update(basePath, id, { ...body, id }, false);
      if (!updated) {
        // Create it if it doesn't exist (PUT semantics)
        const newItem = ensureId({ ...body, id });
        store.create(basePath, newItem);
        res.status(201).json(newItem);
        return;
      }
      res.status(200).json(updated);
      return;
    }

    // PATCH — partial update
    if (method === 'patch') {
      const idParam = route.pathParams[route.pathParams.length - 1]?.name;
      const id      = idParam ? req.params[idParam] : undefined;
      if (id) {
        seedCollection(store, basePath, itemSchema);
        const updated = store.update(basePath, id, req.body ?? {}, true);
        if (!updated) {
          res.status(404).json({ error: 'not_found', message: `Resource with id '${id}' not found` });
          return;
        }
        res.status(200).json(updated);
        return;
      }
      // PATCH with no id — return generated
      res.status(200).json(generateFromSchema(route.responseSchema));
      return;
    }

    // DELETE
    if (method === 'delete') {
      const idParam = route.pathParams[route.pathParams.length - 1]?.name;
      const id      = idParam ? req.params[idParam] : undefined;
      if (id) {
        store.delete(basePath, id);
      }
      res.status(204).end();
      return;
    }

    // Fallback
    res.status(route.statusCode).json(generateFromSchema(route.responseSchema));
  };
}
