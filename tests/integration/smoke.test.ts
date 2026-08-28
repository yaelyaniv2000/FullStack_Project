import { describe, expect, test } from "vitest";
import { createEphemeralUser, deleteEphemeralUser, signInAs } from "./helpers";

describe("integration harness smoke test", () => {
  test("can create, sign in as, and delete an ephemeral worker", async () => {
    const worker = await createEphemeralUser("worker", "smoke");
    try {
      const client = await signInAs(worker.email, worker.password);
      const { data, error } = await client.auth.getUser();
      expect(error).toBeNull();
      expect(data.user?.id).toBe(worker.id);
    } finally {
      await deleteEphemeralUser(worker.id);
    }
  });
});
