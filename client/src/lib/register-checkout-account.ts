import type { PublicUser } from "@shared/user-dto";

type RegistrationContact = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  address: string;
};

// Registration changes discount eligibility. Stop here, then let the signed-in
// checkout display its new total and require an explicit order/payment submit.
export async function registerCheckoutAccount(
  data: RegistrationContact,
  request: (method: string, url: string, data: unknown) => Promise<any>,
  addressLabel: string,
  onAddressError: (error: unknown) => void,
): Promise<PublicUser> {
  const user = await request("POST", "/api/register", {
    username: data.email, firstName: data.firstName, lastName: data.lastName,
    email: data.email, phone: data.phone, password: data.password,
  });
  if (data.address.trim()) {
    try {
      await request("POST", "/api/addresses", { label: addressLabel, address: data.address.trim() });
    } catch (error) {
      onAddressError(error);
    }
  }
  return user;
}
