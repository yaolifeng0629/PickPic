import { Storage } from "@plasmohq/storage"

const storage = new Storage()

export async function getStorageItem<T>(key: string): Promise<T | null> {
  return await storage.get(key)
}

export async function setStorageItem<T>(key: string, value: T): Promise<void> {
  await storage.set(key, value)
}

export async function removeStorageItem(key: string): Promise<void> {
  await storage.remove(key)
}

export async function clearStorage(): Promise<void> {
  await storage.clear()
}
