export interface Meta {
  code: number;
  status: string;
  message: string;
}

export interface Response<T> {
  meta: Meta;
  data?: T;
}

interface ControllerResponse<T> {
  code: number;
  status: string;
  message: string;
  data?: T;
}

export function responseFormatter<T>(
  controllerResponse: ControllerResponse<T>,
): Response<T> {
  const { code, status, message, data } = controllerResponse;
  const response: Response<T> = {
    meta: {
      code,
      status,
      message,
    },
  };
  if (data !== undefined) {
    response.data = data;
  }
  return response;
}
