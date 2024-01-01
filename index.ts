
import type {
    Adapter,
    AdapterUser,
    AdapterAccount,
    AdapterSession,
    VerificationToken,
  } from "next-auth/adapters"

import { getServerClient } from "@liveinference/core-sdk";
import type * as types from "@liveinference/core-sdk";

export default function authAdapter(
  inputClient?: types.ServerClient, 
  options: any = {}
) : Adapter {

  const client = inputClient || getServerClient(options.apiKey, options.apiBaseUrl);
  
  return {
    async createUser(user: Omit<AdapterUser, "id">) {
      const body = convertAuthUser(user);
      const { data } = await client.
        request('/api/v1/user', {method: 'POST', body});
      return convertApiUser(data) as AdapterUser;
    },
    async getUser(id: string) {
      const { data, error } = await client.
        request('/api/v1/user/' + id, {method: 'GET'});
      if (!data || error) return null;
      return convertApiUser(data);
    },
    async getUserByEmail(email: string) {
      const { data, error } = await client.
        request('/api/v1/user/by-email/' + email, {method: 'GET'});
      if (!data || error) return null;
      return convertApiUser(data);
    },
    async getUserByAccount({ providerAccountId, provider }: { providerAccountId: string, provider: string }) {
      const { data, error } = await client.
        request('/api/v1/user/by-account/' + provider + '/' + providerAccountId, {method: 'GET'});
      if (!data || error) return null;
      return convertApiUser(data);
    },
    async updateUser(user: Partial<AdapterUser> & Pick<AdapterUser, "id">) {
      const body = convertAuthUser(user);
      const { data, error } = await client.
        request('/api/v1/user/' + user.id, {method: 'PUT', body});
      if (!data || error) {
        throw new Error(error?.message || "updateUser failed");
      }
      return convertApiUser(data) as AdapterUser;
    },
    async deleteUser(userId: string) {
      await client.request('/api/v1/user/' + userId, {method: 'DELETE'});
    },
    async linkAccount(account: AdapterAccount) {
      await client.request('/api/v1/user/link-account', 
        {method: 'POST', body: account});
    },
    async unlinkAccount({ providerAccountId, provider } : 
        { providerAccountId: string, provider: string }) : Promise<any>{
      const { data, error } = await client.
        request('/api/v1/user/unlink-account/' + provider + '/' + providerAccountId, 
          {method: 'DELETE'});
      if (!data || error) return null;
      return data;
    },
    async createSession({ sessionToken, userId, expires } : 
        { sessionToken: string, userId: string, expires: Date }) {
      const { data, error } = await client.
        request('/api/v1/user/session', 
          {method: 'POST', body: {sessionToken, userId, expires}});
      if (!data || error) {
        throw new Error(error?.message || "createSession failed");
      }
      const { expires: returnedExpires } = convertApiSession(data) || {};
      return { sessionToken, expires: returnedExpires } as AdapterSession;
    },
    async getSessionAndUser(sessionToken : string) {
      const { data, error } = await client.
        request('/api/v1/user/session/' + sessionToken, {method: 'GET'});
      if (!data || error) return null;
      const { expires, user } = convertApiSession(data) || {};
      if (!user) return null;
      const session = { sessionToken, expires } as AdapterSession;
      return { session, user };
    },
    async updateSession({ sessionToken, ...body }: any) {
      if (!sessionToken) throw new Error("sessionToken is not set");
      const { data } = await client.
        request('/api/v1/user/session/' + sessionToken, 
          {method: 'PUT', body});
        const { expires } = convertApiSession(data) || {};
        return { sessionToken, expires } as AdapterSession;
    },
    async deleteSession(sessionToken : string) {
        await client.request('/api/v1/user/session/' + sessionToken, 
            {method: 'DELETE'});
    },
    async createVerificationToken({ identifier, expires, token } : 
            { identifier: string, expires: Date, token: string }) {
        const { data, error } = await client.
            request('/api/v1/user/verification-token', 
                {method: 'POST', body: {identifier, expires, token}});
        if (!data || error) {
            throw new Error(error?.message || "createVerificationToken failed");
        }
        return data;
    },
    async useVerificationToken({ identifier, token }: 
        { identifier: string, token: string }) {
      const { data, error } = await client.
        request('/api/v1/user/use-verification-token', 
          {method: 'POST', body: {identifier, token}});
      if (!data || error) return null;
      return data as VerificationToken;
    },
  };
}

function convertAuthUser(data: any) {
  if (!data) return;
  const { 
    name: username, 
    emailVerified: emailVerifiedAt, 
    phoneVerified: phoneVerifiedAt, 
    ...rest 
  } = data;
  return { ...rest, username, emailVerifiedAt, phoneVerifiedAt };
}

function convertApiUser(data: any): AdapterUser | null {
  if (!data) return null;
  const {
    username: name, 
    emailVerifiedAt, 
    phoneVerifiedAt,
    createdAt,
    updatedAt,
    blocked,
    ...rest 
  } = data;
  if (blocked) return null;
  const result = { ...rest, name };
  if (emailVerifiedAt) {
    result.emailVerified = new Date(emailVerifiedAt);
  }
  if (phoneVerifiedAt) {
    result.phoneVerified = new Date(phoneVerifiedAt);
  }
  if (createdAt) {
    result.createdAt = new Date(createdAt);
  }
  if (updatedAt) {
    result.updatedAt = new Date(updatedAt);
  }
  return result;
}

function convertApiSession(data: any) : { expires: Date, user: AdapterUser } | null {
  if (!data) return null;
  if (data.expires) {
    data.expires = new Date(data.expires);
  }
  if (data.user) {
    data.user = convertApiUser(data.user);
  }
  return data;
}

