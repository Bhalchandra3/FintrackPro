export const generateResponse = (success, message, data = null, error = null) => {
  const response = { success, message, timestamp: new Date().toISOString() };
  if (data) response.data = data;
  if (error) response.error = error;
  return response;
};
