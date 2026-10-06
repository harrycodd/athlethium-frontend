/**
 * Minimal in-memory stand-in for the 'firebase/firestore' functions the app uses.
 * Supports equality `where` filters, document listeners and query listeners, which is all the
 * app's services rely on. Use `fakeFirestore.reset()` between tests and `seed()` to add docs.
 */
type Data = Record<string, any>;
type Listener = () => void;

const DELETE = Symbol('deleteField');
const collections = new Map<string, Map<string, Data>>();
const listeners = new Set<Listener>();
let nextId = 1;

const coll = (name: string) => {
  if (!collections.has(name)) collections.set(name, new Map());
  return collections.get(name)!;
};
const notify = () => listeners.forEach((l) => l());

export const fakeFirestore = {
  reset() {
    collections.clear();
    listeners.clear();
    nextId = 1;
  },
  seed(collection: string, id: string, data: Data) {
    coll(collection).set(id, { ...data });
    notify();
  },
  get(collection: string, id: string): Data | undefined {
    return coll(collection).get(id);
  },
  all(collection: string): Record<string, Data> {
    return Object.fromEntries(coll(collection));
  },
  /** Simulates a server-side write (e.g. the generate_training_session function). */
  serverWrite(collection: string, id: string, data: Data) {
    this.seed(collection, id, data);
  },
};

const snapshotOf = (collection: string, id: string) => {
  const data = coll(collection).get(id);
  return { id, exists: () => data !== undefined, data: () => (data ? { ...data } : undefined) };
};

export const collection = (_db: unknown, name: string) => ({ kind: 'collection', name });
export const doc = (_db: unknown, name: string, id: string) => ({ kind: 'doc', name, id });
export const where = (field: string, op: string, value: unknown) => {
  if (op !== '==') throw new Error(`fake firestore supports == only (got ${op})`);
  return { field, value };
};
export const query = (ref: { name: string }, ...filters: { field: string; value: unknown }[]) => ({
  kind: 'query',
  name: ref.name,
  filters,
});

const runQuery = (q: { name: string; filters?: { field: string; value: unknown }[] }) => {
  const docs = [...coll(q.name).entries()]
    .filter(([, d]) => (q.filters || []).every((f) => d[f.field] === f.value))
    .map(([id]) => snapshotOf(q.name, id));
  return { empty: docs.length === 0, size: docs.length, docs };
};

export const getDocs = async (q: any) => runQuery(q);
export const getDoc = async (ref: { name: string; id: string }) => snapshotOf(ref.name, ref.id);
export const setDoc = async (ref: { name: string; id: string }, data: Data) => fakeFirestore.seed(ref.name, ref.id, data);
export const addDoc = async (ref: { name: string }, data: Data) => {
  const id = `auto_${nextId++}`;
  fakeFirestore.seed(ref.name, id, data);
  return { id };
};
export const updateDoc = async (ref: { name: string; id: string }, data: Data) => {
  const current = coll(ref.name).get(ref.id);
  if (!current) throw Object.assign(new Error('No document to update'), { code: 'not-found' });
  const next = { ...current };
  for (const [k, v] of Object.entries(data)) {
    if (v === DELETE) delete next[k];
    else next[k] = v;
  }
  fakeFirestore.seed(ref.name, ref.id, next);
};
export const deleteDoc = async (ref: { name: string; id: string }) => {
  coll(ref.name).delete(ref.id);
  notify();
};

export const onSnapshot = (ref: any, next: (snap: any) => void) => {
  const emit = () => next(ref.kind === 'doc' ? snapshotOf(ref.name, ref.id) : runQuery(ref));
  listeners.add(emit);
  emit();
  return () => listeners.delete(emit);
};

export const deleteField = () => DELETE;
export const serverTimestamp = () => 'SERVER_TIMESTAMP';
export const Timestamp = { now: () => ({ toDate: () => new Date(), seconds: Math.floor(Date.now() / 1000) }) };
export const getFirestore = () => ({});
export const initializeFirestore = () => ({});
export const memoryLocalCache = () => ({});
