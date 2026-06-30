import type { Account, Category, Operation, Subcategory, Target } from '@/types'

export type FinanceData = {
  Account?: Account[]
  Category?: Category[]
  Operation?: Operation[]
  Subcategory?: Subcategory[]
  Target?: Target[]
}

const DB_NAME = 'budget-db'
const DB_VERSION = 1
const STORE_NAME = 'finance-data'
const DATA_KEY = 'current'

function openFinanceDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const database = request.result

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME)
      }
    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onerror = () => {
      reject(request.error)
    }
  })
}

function runStoreRequest<T>(mode: IDBTransactionMode, handler: (store: IDBObjectStore) => IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    openFinanceDb()
      .then(database => {
        const transaction = database.transaction(STORE_NAME, mode)
        const store = transaction.objectStore(STORE_NAME)
        const request = handler(store)
        let result: T | undefined

        request.onsuccess = () => {
          result = request.result
        }

        request.onerror = () => {
          reject(request.error)
        }

        transaction.oncomplete = () => {
          database.close()
          resolve(result as T)
        }

        transaction.onerror = () => {
          database.close()
          reject(transaction.error)
        }
      })
      .catch(reject)
  })
}

export function readFinanceData() {
  return runStoreRequest<FinanceData | undefined>('readonly', store => store.get(DATA_KEY))
}

export function writeFinanceData(data: FinanceData) {
  return runStoreRequest<IDBValidKey>('readwrite', store => store.put(data, DATA_KEY))
}
