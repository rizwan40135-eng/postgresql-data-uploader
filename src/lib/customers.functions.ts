import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { listCustomers, insertCustomer, removeCustomer } from "./customers.server";

export const getCustomers = createServerFn({ method: "GET" }).handler(() => listCustomers());

export const createCustomer = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      name: z.string().trim().min(1).max(100),
      email: z.string().trim().email().max(255),
      city: z.string().trim().max(100).nullable(),
      plan: z.enum(["Basic", "Pro", "Enterprise"]),
    }).parse(d),
  )
  .handler(({ data }) => insertCustomer(data));

export const deleteCustomer = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(({ data }) => removeCustomer(data.id));
