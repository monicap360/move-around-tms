/**
 * Client-safe alert utility that works in both browser and SSR contexts
 */
export const safeAlert = (message: string) => {
  if (typeof window !== "undefined") {
    alert(message);
  } else {
    console.log("Alert:", message);
  }
};

/**
 * Client-safe confirm utility that works in both browser and SSR contexts
 */
export const safeConfirm = (message: string): boolean => {
  if (typeof window !== "undefined") {
    return confirm(message);
  } else {
    console.log("Confirm:", message);
    return true; // Default to true in SSR context
  }
};
