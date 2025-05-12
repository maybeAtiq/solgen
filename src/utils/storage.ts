export const saveData = async (key: string, value: any) => {
    await chrome.storage.local.set({ [key]: value });
  };
  
  export const getData = async (key: string) => {
    const result = await chrome.storage.local.get(key);
    return result[key];
  };
  