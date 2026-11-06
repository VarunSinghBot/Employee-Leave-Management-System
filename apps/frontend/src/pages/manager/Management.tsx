import { useEffect, useState } from "react";
import { UserPlus, UserRoundCheck } from "lucide-react";
import { managementAccountSchema, type ManagementAccountInput, type ManagementOverview } from "@elms/shared";
import { managementService } from "../../services/management.service";
import { Button } from "../../components/ui/Button";
import { Card, CardHeader } from "../../components/ui/Card";
import { Input, PasswordInput, Select } from "../../components/ui/Field";
import { EmptyState, Spinner } from "../../components/ui/Feedback";
import { PageHeader } from "../../components/ui/PageHeader";
import { getFieldErrors, validateWith, type FieldErrors } from "../../utils/format.util";
import { notify } from "../../UI/Toast";

const EMPTY_ACCOUNT: ManagementAccountInput = { name: "", email: "", password: "", role: "MANAGER" };

export default function Management() {
  const [overview, setOverview] = useState<ManagementOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState(EMPTY_ACCOUNT);
  const [accountErrors, setAccountErrors] = useState<FieldErrors>({});
  const [accountBusy, setAccountBusy] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedManager, setSelectedManager] = useState("");
  const [assignmentBusy, setAssignmentBusy] = useState(false);

  const load = async () => {
    try {
      setOverview((await managementService.overview()).data);
    } catch (error) {
      notify.apiError(error, "Could not load department management");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const createAccount = async () => {
    const result = validateWith(managementAccountSchema, account);
    if (!result.data) {
      setAccountErrors(result.errors);
      return;
    }
    setAccountBusy(true);
    try {
      const response = await managementService.createAccount(result.data);
      notify.success(response.message, `${response.data.name} can now sign in`);
      setAccount(EMPTY_ACCOUNT);
      setAccountErrors({});
      await load();
    } catch (error) {
      setAccountErrors(getFieldErrors(error));
      notify.apiError(error, "Could not create account");
    } finally {
      setAccountBusy(false);
    }
  };

  const assign = async () => {
    if (!selectedEmployee || !selectedManager) return;
    setAssignmentBusy(true);
    try {
      const response = await managementService.assign({ employeeId: selectedEmployee, managerId: selectedManager });
      notify.success(response.message);
      setSelectedEmployee("");
      await load();
    } catch (error) {
      notify.apiError(error, "Could not assign employee");
    } finally {
      setAssignmentBusy(false);
    }
  };

  if (loading) return <Spinner />;
  if (!overview) return null;

  return (
    <>
      <PageHeader title="Manage department" subtitle="Create management accounts and assign employees to their manager." />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title="Create management account" subtitle="Accounts are created in your department." />
          <div className="space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Full name" value={account.name} onChange={(e) => setAccount({ ...account, name: e.target.value })} error={accountErrors.name} />
              <Select label="Role" value={account.role} onChange={(e) => setAccount({ ...account, role: e.target.value as ManagementAccountInput["role"] })} error={accountErrors.role}>
                <option value="MANAGER">Manager</option>
                <option value="HOD">Head of Department</option>
              </Select>
            </div>
            <Input label="Work email" type="email" value={account.email} onChange={(e) => setAccount({ ...account, email: e.target.value })} error={accountErrors.email} />
            <PasswordInput label="Temporary password" value={account.password} onChange={(e) => setAccount({ ...account, password: e.target.value })} error={accountErrors.password} />
            <Button loading={accountBusy} onClick={() => void createAccount()} icon={<UserPlus className="size-4" />}>
              Create account
            </Button>
          </div>
        </Card>

        <Card>
          <CardHeader title="Assign unassigned employees" subtitle="Only employees in your department are listed." />
          <div className="space-y-4 p-5">
            <Select label="Employee" value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)}>
              <option value="">Select an employee</option>
              {overview.unassignedEmployees.map((employee) => (
                <option key={employee.id} value={employee.id}>{employee.name} · {employee.email}</option>
              ))}
            </Select>
            <Select label="Manager" value={selectedManager} onChange={(e) => setSelectedManager(e.target.value)}>
              <option value="">Select a manager</option>
              {overview.managers.map((manager) => (
                <option key={manager.id} value={manager.id}>{manager.name} · {manager.reportsCount} report(s)</option>
              ))}
            </Select>
            <Button disabled={!selectedEmployee || !selectedManager} loading={assignmentBusy} onClick={() => void assign()} icon={<UserRoundCheck className="size-4" />}>
              Assign employee
            </Button>
            {!overview.unassignedEmployees.length && <EmptyState title="Everyone is assigned" message="There are no unassigned employees in your department." />}
            {!overview.managers.length && <EmptyState title="No managers yet" message="Create a manager account before assigning employees." />}
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader title="Department managers" subtitle="Current reporting capacity in your department." />
        {overview.managers.length ? (
          <ul className="divide-y divide-slate-100">
            {overview.managers.map((manager) => (
              <li key={manager.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                <div>
                  <p className="font-medium text-slate-800">{manager.name}</p>
                  <p className="text-xs text-slate-500">{manager.email}</p>
                </div>
                <span className="rounded-lg bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700">{manager.reportsCount} report(s)</span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No managers created" message="Create a manager account above." />
        )}
      </Card>
    </>
  );
}
