import type { LoaderFunctionArgs } from "react-router";
import { redirect, Form, useLoaderData } from "react-router";

import { login } from "../../shopify.server";

import styles from "./styles.module.css";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { showForm: Boolean(login) };
};

export default function App() {
  const { showForm } = useLoaderData<typeof loader>();

  return (
    <div className={styles.index}>
      <div className={styles.content}>
        <h1 className={styles.heading}>RT Shopify App</h1>
        <p className={styles.text}>
          Sign in to the app shell while the new Shopify-native B2B
          implementation is rebuilt.
        </p>
        {showForm && (
          <Form className={styles.form} method="post" action="/auth/login">
            <label className={styles.label}>
              <span>Shop domain</span>
              <input className={styles.input} type="text" name="shop" />
              <span>e.g: my-shop-domain.myshopify.com</span>
            </label>
            <button className={styles.button} type="submit">
              Log in
            </button>
          </Form>
        )}
        <ul className={styles.list}>
          <li>
            <strong>Lifecycle</strong>. Core app authentication and Shopify
            lifecycle hooks remain in place.
          </li>
          <li>
            <strong>Boilerplate</strong>. Temporary webhook and app proxy routes
            are kept as rebuild anchors.
          </li>
          <li>
            <strong>Extensions</strong>. Customer account extensions remain the
            target surface for the B2B experience.
          </li>
        </ul>
      </div>
    </div>
  );
}
