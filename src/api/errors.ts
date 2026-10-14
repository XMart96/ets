// Error codes raised by the SQL functions (`raise exception '<code>'`) and a
// few Supabase auth codes, mapped to texts for the user.
const MESSAGES: Record<string, string> = {
  timer_already_running: "Таймер уже запущен",
  clinic_not_found: "Клиника не найдена. Проверьте метку",
  profile_missing: "Сначала заполните профиль",
  not_authenticated: "Войдите в аккаунт заново",
  no_active_timer: "Нет запущенного таймера",
  forbidden: "Нет доступа",
  wrong_current_password: "Текущий пароль неверный",
  invalid_credentials: "Неверный email или пароль",
  user_already_exists: "Этот email уже зарегистрирован. Войдите.",
  weak_password: "Слишком простой пароль",
  over_email_send_rate_limit: "Слишком много писем. Попробуйте позже",
};

/** Error from the backend; `code` is the SQL exception text or the auth error code. */
export class ApiError extends Error {
  code: string;

  constructor(message: string, code?: string) {
    super(message);
    this.code = code ?? message;
  }
}

type BackendError = { message: string; code?: string };

/** Returns `data`, or throws ApiError if the Supabase response has an error. */
export function unwrap<T>(res: { data: T; error: BackendError | null }): T {
  if (res.error) throw new ApiError(res.error.message, res.error.code);
  return res.data;
}

/** Text to show the user for any thrown error. */
export function errorText(e: unknown): string {
  if (e instanceof ApiError) {
    return MESSAGES[e.message] ?? MESSAGES[e.code] ?? e.message;
  }
  return "Не удалось подключиться. Проверьте интернет.";
}
