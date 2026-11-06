import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserPlus } from "lucide-react";
import { signupFormSchema, type Department, type SignupFormInput } from "@elms/shared";
import { useAppDispatch } from "../../store";
import { register } from "../../store/auth.slice";
import { authService } from "../../services/auth.service";
import { Button } from "../../components/ui/Button";
import { Input, PasswordInput, Select } from "../../components/ui/Field";
import { getFieldErrors, validateWith, type FieldErrors } from "../../utils/format.util";
import { notify } from "../../UI/Toast";

export default function Signup() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [values, setValues] = useState<SignupFormInput>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    departmentId: "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    authService
      .departments()
      .then((res) => setDepartments(res.data))
      .catch((error) => notify.apiError(error, "Could not load departments"));
  }, []);

  const set = (key: keyof SignupFormInput, value: string) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const { data, errors: clientErrors } = validateWith(signupFormSchema, values);
    if (!data) return setErrors(clientErrors);

    setLoading(true);
    const { confirmPassword: _confirm, ...payload } = data;
    const result = await dispatch(register(payload));
    setLoading(false);

    if (register.fulfilled.match(result)) {
      notify.success("Account created", "Welcome aboard! You can apply for leave right away.");
      navigate("/dashboard", { replace: true });
    } else {
      setErrors(getFieldErrors(result.payload));
      notify.apiError(result.payload, "Sign up failed");
    }
  };

  return (
    <>
      <h2 className="text-2xl font-semibold">Create your account</h2>
      <p className="mt-1 text-sm text-slate-500">New accounts join as employees and report to their department's manager.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
        <Input label="Full name" placeholder="John Carter" value={values.name} onChange={(e) => set("name", e.target.value)} error={errors.name} />
        <Input
          label="Work email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          value={values.email}
          onChange={(e) => set("email", e.target.value)}
          error={errors.email}
        />
        <PasswordInput
          label="Password"
          autoComplete="new-password"
          placeholder="At least 8 characters with a number"
          value={values.password}
          onChange={(e) => set("password", e.target.value)}
          error={errors.password}
        />
        <PasswordInput
          label="Confirm password"
          autoComplete="new-password"
          placeholder="Re-enter your password"
          value={values.confirmPassword}
          onChange={(e) => set("confirmPassword", e.target.value)}
          error={errors.confirmPassword}
        />
        <Select label="Department" value={values.departmentId} onChange={(e) => set("departmentId", e.target.value)} error={errors.departmentId}>
          <option value="">Select your department</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>
        <Button type="submit" className="w-full" loading={loading} icon={<UserPlus className="size-4" />}>
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link to="/auth/login" className="font-semibold text-violet-600 hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
