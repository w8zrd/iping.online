import { supabase } from "../lib/supabase";
import { Profile } from "../types";
import { logger } from "@/lib/logger";

/**
 * Follows a user by inserting a row into the 'follows' table.
 * The follower_id is automatically set via RLS policy (auth.uid()).
 * @param user_to_follow_id The ID of the user to follow.
 */
export async function followUser(user_to_follow_id: string) {
  const { error } = await supabase
    .from("follows")
    .insert({
      followed_id: user_to_follow_id,
    });

  if (error) {
    logger.error('Failed to follow user:', error, { userMessage: 'Could not follow user. Please try again.' });
    throw new Error(error.message);
  }
}

/**
 * Unfollows a user by deleting a row from the 'follows' table.
 * The follower_id is automatically checked via RLS policy (auth.uid()).
 * @param user_to_unfollow_id The ID of the user to unfollow.
 */
export async function unfollowUser(user_to_unfollow_id: string) {
  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("followed_id", user_to_unfollow_id);
    // follower_id is implicitly checked by RLS policy

  if (error) {
    logger.error('Failed to unfollow user:', error, { userMessage: 'Could not unfollow user. Please try again.' });
    throw new Error(error.message);
  }
}

/**
 * Checks if the current authenticated user is following the target user.
 * @param target_user_id The ID of the user to check the following status for.
 * @returns A promise that resolves to a boolean: true if following, false otherwise.
 */
export async function isFollowing(target_user_id: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("follows")
    .select("id")
    .eq("followed_id", target_user_id)
    .single();

  if (error && error.code !== "PGRST116") { // PGRST116 means no rows found (not following)
    logger.error('Error checking follow status:', error, { userMessage: 'Failed to check follow status.' });
    throw new Error(error.message);
  }

  // If data exists, it means a row was found, and the user is following.
  return !!data;
}

/**
 * Updates the current authenticated user's profile information.
 * @param profileUpdate An object containing the fields to update (username, display_name, bio, location).
 */
export async function updateUserProfile(profileUpdate: { username?: string; display_name?: string; bio?: string; location?: string }) {
  const { error } = await supabase
    .from("profiles")
    // Note: RLS policy prevents updating 'is_admin', so it is omitted from updates.
    .update(profileUpdate)
    .eq("id", (await supabase.auth.getUser()).data.user?.id)
    .select();

  if (error) {
    logger.error('Failed to update user profile:', error, { userMessage: 'Could not update profile. Please try again.' });
    throw new Error(error.message);
  }
}
/**
 * Fetches the total count of users in the 'profiles' table.
 * @returns A promise that resolves to the total user count.
 */
export async function getUserCount(): Promise<number> {
  const { count, error } = await supabase
    .from("profiles")
    .select("id", { count: 'exact', head: true });

  if (error) {
    logger.error('Failed to fetch user count:', error, { userMessage: 'Could not retrieve user count.' });
    throw new Error(error.message);
  }

  // count should be a number if successful, or null/undefined if an error occurred (handled above)
  return count || 0;
}