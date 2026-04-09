import LoginForm from "./LoginForm";
import styles from "./login.module.css";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token");
  
  if (token?.value === "admin_logged_in") {
    redirect("/admin/dashboard");
  }

  return (
    <div className={styles.container}>
      <LoginForm />
    </div>
  );
}
