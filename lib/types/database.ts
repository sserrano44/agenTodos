export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      admin_users: {
        Row: {
          user_id: string;
          email: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          email: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          email?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          user_id: string;
          email: string;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
          last_sign_in_at: string | null;
        };
        Insert: {
          user_id: string;
          email?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
          last_sign_in_at?: string | null;
        };
        Update: {
          user_id?: string;
          email?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
          last_sign_in_at?: string | null;
        };
        Relationships: [];
      };
      workspaces: {
        Row: {
          id: string;
          name: string;
          slug: string;
          created_by_user_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          created_by_user_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          created_by_user_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      workspace_memberships: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          role: "owner" | "admin" | "member";
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          role?: "owner" | "admin" | "member";
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          user_id?: string;
          role?: "owner" | "admin" | "member";
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workspace_memberships_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      agents: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          source_type: "claude_cowork" | "openclaw" | "custom";
          description: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          last_used_at: string | null;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          source_type: "claude_cowork" | "openclaw" | "custom";
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          last_used_at?: string | null;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          name?: string;
          source_type?: "claude_cowork" | "openclaw" | "custom";
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          last_used_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "agents_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      agent_api_keys: {
        Row: {
          id: string;
          agent_id: string;
          workspace_id: string;
          label: string;
          key_prefix: string;
          key_last4: string;
          key_hash: string;
          scopes: ("todos:read" | "todos:write" | "mcp:use")[];
          is_active: boolean;
          created_at: string;
          updated_at: string;
          last_used_at: string | null;
          revoked_at: string | null;
        };
        Insert: {
          id?: string;
          agent_id: string;
          workspace_id: string;
          label: string;
          key_prefix: string;
          key_last4: string;
          key_hash: string;
          scopes: ("todos:read" | "todos:write" | "mcp:use")[];
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          last_used_at?: string | null;
          revoked_at?: string | null;
        };
        Update: {
          id?: string;
          agent_id?: string;
          workspace_id?: string;
          label?: string;
          key_prefix?: string;
          key_last4?: string;
          key_hash?: string;
          scopes?: ("todos:read" | "todos:write" | "mcp:use")[];
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          last_used_at?: string | null;
          revoked_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "agent_api_keys_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "agent_api_keys_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      oauth_authorization_codes: {
        Row: {
          id: string;
          code_hash: string;
          user_id: string;
          workspace_id: string;
          client_id: string;
          redirect_uri: string;
          scope: string[];
          resource: string;
          code_challenge: string;
          code_challenge_method: string;
          expires_at: string;
          used_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          code_hash: string;
          user_id: string;
          workspace_id: string;
          client_id: string;
          redirect_uri: string;
          scope?: string[];
          resource: string;
          code_challenge: string;
          code_challenge_method?: string;
          expires_at: string;
          used_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          code_hash?: string;
          user_id?: string;
          workspace_id?: string;
          client_id?: string;
          redirect_uri?: string;
          scope?: string[];
          resource?: string;
          code_challenge?: string;
          code_challenge_method?: string;
          expires_at?: string;
          used_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "oauth_authorization_codes_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      oauth_refresh_tokens: {
        Row: {
          id: string;
          refresh_token_hash: string;
          user_id: string;
          workspace_id: string;
          client_id: string;
          scope: string[];
          resource: string;
          expires_at: string;
          revoked_at: string | null;
          created_at: string;
          last_used_at: string | null;
        };
        Insert: {
          id?: string;
          refresh_token_hash: string;
          user_id: string;
          workspace_id: string;
          client_id: string;
          scope?: string[];
          resource: string;
          expires_at: string;
          revoked_at?: string | null;
          created_at?: string;
          last_used_at?: string | null;
        };
        Update: {
          id?: string;
          refresh_token_hash?: string;
          user_id?: string;
          workspace_id?: string;
          client_id?: string;
          scope?: string[];
          resource?: string;
          expires_at?: string;
          revoked_at?: string | null;
          created_at?: string;
          last_used_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "oauth_refresh_tokens_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      oauth_access_tokens: {
        Row: {
          id: string;
          access_token_hash: string;
          refresh_token_id: string | null;
          user_id: string;
          workspace_id: string;
          client_id: string;
          scope: string[];
          resource: string;
          expires_at: string;
          revoked_at: string | null;
          created_at: string;
          last_used_at: string | null;
        };
        Insert: {
          id?: string;
          access_token_hash: string;
          refresh_token_id?: string | null;
          user_id: string;
          workspace_id: string;
          client_id: string;
          scope?: string[];
          resource: string;
          expires_at: string;
          revoked_at?: string | null;
          created_at?: string;
          last_used_at?: string | null;
        };
        Update: {
          id?: string;
          access_token_hash?: string;
          refresh_token_id?: string | null;
          user_id?: string;
          workspace_id?: string;
          client_id?: string;
          scope?: string[];
          resource?: string;
          expires_at?: string;
          revoked_at?: string | null;
          created_at?: string;
          last_used_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "oauth_access_tokens_refresh_token_id_fkey";
            columns: ["refresh_token_id"];
            isOneToOne: false;
            referencedRelation: "oauth_refresh_tokens";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "oauth_access_tokens_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      todos: {
        Row: {
          id: string;
          workspace_id: string;
          title: string;
          description: string | null;
          status: "todo" | "in_progress" | "done" | "blocked" | "archived";
          priority: "low" | "medium" | "high" | "urgent";
          source: "claude_cowork" | "openclaw" | "manual" | "api" | "mcp";
          external_id: string | null;
          agent_id: string | null;
          due_at: string | null;
          scheduled_for: string | null;
          tags: string[];
          metadata: Json;
          created_at: string;
          updated_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          title: string;
          description?: string | null;
          status?: "todo" | "in_progress" | "done" | "blocked" | "archived";
          priority?: "low" | "medium" | "high" | "urgent";
          source?: "claude_cowork" | "openclaw" | "manual" | "api" | "mcp";
          external_id?: string | null;
          agent_id?: string | null;
          due_at?: string | null;
          scheduled_for?: string | null;
          tags?: string[];
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          title?: string;
          description?: string | null;
          status?: "todo" | "in_progress" | "done" | "blocked" | "archived";
          priority?: "low" | "medium" | "high" | "urgent";
          source?: "claude_cowork" | "openclaw" | "manual" | "api" | "mcp";
          external_id?: string | null;
          agent_id?: string | null;
          due_at?: string | null;
          scheduled_for?: string | null;
          tags?: string[];
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "todos_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "todos_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      todo_events: {
        Row: {
          id: string;
          workspace_id: string;
          todo_id: string;
          actor_type: "admin" | "agent" | "system";
          actor_id: string | null;
          event_type: string;
          payload: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          todo_id: string;
          actor_type: "admin" | "agent" | "system";
          actor_id?: string | null;
          event_type: string;
          payload?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          todo_id?: string;
          actor_type?: "admin" | "agent" | "system";
          actor_id?: string | null;
          event_type?: string;
          payload?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "todo_events_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      api_rate_limit_buckets: {
        Row: {
          api_key_id: string;
          bucket_start: string;
          request_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          api_key_id: string;
          bucket_start: string;
          request_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          api_key_id?: string;
          bucket_start?: string;
          request_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "api_rate_limit_buckets_api_key_id_fkey";
            columns: ["api_key_id"];
            isOneToOne: false;
            referencedRelation: "agent_api_keys";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      app_is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      app_is_workspace_member: {
        Args: {
          p_workspace_id: string;
        };
        Returns: boolean;
      };
      app_is_workspace_admin: {
        Args: {
          p_workspace_id: string;
        };
        Returns: boolean;
      };
      ensure_private_workspace_for_user: {
        Args: {
          p_user_id: string;
          p_email?: string;
          p_display_name?: string | null;
          p_avatar_url?: string | null;
        };
        Returns: string;
      };
      consume_api_rate_limit: {
        Args: {
          p_api_key_id: string;
          p_limit: number;
        };
        Returns: boolean;
      };
    };
    Enums: {
      todo_status: "todo" | "in_progress" | "done" | "blocked" | "archived";
      todo_priority: "low" | "medium" | "high" | "urgent";
      todo_source: "claude_cowork" | "openclaw" | "manual" | "api" | "mcp";
      agent_source_type: "claude_cowork" | "openclaw" | "custom";
      workspace_role: "owner" | "admin" | "member";
      api_key_scope: "todos:read" | "todos:write" | "mcp:use";
      todo_event_actor_type: "admin" | "agent" | "system";
    };
  };
};
