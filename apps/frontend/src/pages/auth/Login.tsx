import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogIn } from "lucide-react";
import { loginSchema, type LoginInput } from "@elms/shared";
import { useAppDispatch } from "../../store";
import { login } from "../../store/auth.slice";
import { Button } from "../../components/ui/Button";
import { Input, PasswordInput } from "../../components/ui/Field";
import { getFieldErrors, validateWith, type FieldErrors } from "../../utils/format.util";
import { notify } from "../../UI/Toast";

// Seeded accounts (see apps/backend/prisma/seed.ts) for quick evaluation
const DEMO_ACCOUNTS = [
  { label: "Employee", email: "john@elms.dev" },
  { label: "Manager", email: "manager@elms.dev" },
  { label: "HOD", email: "hod@elms.dev" },
];
const DEMO_PASSWORD = "Password@123";

export default function Login() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [values, setValues] = useState<LoginInput>({ email: "", password: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const { data, errors: clientErrors } = validateWith(loginSchema, values);
    if (!data) return setErrors(clientErrors);

    setLoading(true);
    const result = await dispatch(login(data));
    setLoading(false);

    if (login.fulfilled.match(result)) {
      notify.success(result.payload.message, `Signed in as ${result.payload.data.name}`);
      navigate((location.state as { from?: string } | null)?.from ?? "/dashboard", { replace: true });
    } else {
      setErrors(getFieldErrors(result.payload));
      notify.apiError(result.payload, "Sign in failed");
    }
  };

  return (
    <>
      <h2 className="text-2xl font-semibold">Welcome back</h2>
      <p className="mt-1 text-sm text-slate-500">Sign in to manage your leave requests.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
        <Input
          label="Work email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          value={values.email}
          onChange={(e) => setValues({ ...values, email: e.target.value })}
          error={errors.email}
        />
        <PasswordInput
          label="Password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={values.password}
          onChange={(e) => setValues({ ...values, password: e.target.value })}
          error={errors.password}
        />
        <Button type="submit" className="w-full" loading={loading} icon={<LogIn className="size-4" />}>
          Sign in
        </Button>
      </form>

      <div className="mt-6 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
        <p className="text-xs font-medium text-slate-500">Demo accounts · password {DEMO_PASSWORD}</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {DEMO_ACCOUNTS.map((acc) => (
            <button
              key={acc.email}
              type="button"
              onClick={() => {
                setValues({ email: acc.email, password: DEMO_PASSWORD });
                setErrors({});
              }}
              className="rounded-xl bg-white px-2 py-2 text-xs font-medium text-slate-700 ring-1 ring-slate-200 hover:ring-violet-300"
            >
              {acc.label}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-slate-500">
        New here?{" "}
        <Link to="/auth/signup" className="font-semibold text-violet-600 hover:underline">
          Create an account
        </Link>
      </p>
    </>
  );
}
