// Types based on the database models
export default interface ApiResponse<T> {
  data: T;
  success: boolean;
  message: string;
}
