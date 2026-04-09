"use client";

import { useActionState } from "react";
import { login } from "../actions/auth";
import styles from "./login.module.css";

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(
    async (prevState: any, formData: FormData) => {
      return await login(formData);
    },
    null
  );

  return (
    <form action={formAction} className={styles.form}>
      <div className={styles.header}>
        <h2>Admin Login</h2>
        <p>Sign in to access the Cyfoxgen dashboard</p>
      </div>

      <div className={styles.inputGroup}>
        <label htmlFor="username">Username</label>
        <input 
          id="username" 
          name="username" 
          type="text" 
          placeholder="admin"
          required 
          className={styles.input}
        />
      </div>

      <div className={styles.inputGroup}>
        <label htmlFor="password">Password</label>
        <input 
          id="password" 
          name="password" 
          type="password" 
          placeholder="••••••••"
          required 
          className={styles.input}
        />
      </div>

      {state?.error && <div className={styles.error}>{state.error}</div>}

      <button type="submit" disabled={pending} className={styles.submitBtn}>
        {pending ? "Logging in..." : "Login"}
      </button>
    </form>
  );
}
