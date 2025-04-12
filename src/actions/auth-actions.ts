"use server";

import { createClient } from "@/lib/supabase/server";

export async function requireAuth() {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();

    if (error) {
        console.error("Error fetching session:", error);
        throw new Error("Failed to fetch session");
    }

    if (!data.user) {
        throw new Error("You must be logged in to access this resource.");
    }

    return data.user;
}

export async function loginUser(email: string, password: string) {
    const supabase = await createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        throw error;
    }

    return data;
}

export async function logoutUser() {
    const supabase = await createClient();

    const { error } = await supabase.auth.signOut();

    if (error) {
        throw error;
    }

    return null;
}