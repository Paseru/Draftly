import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

// Create a new project after generation completes
export const createProject = mutation({
    args: {
        title: v.string(),
        prompt: v.string(),
        screens: v.array(v.object({
            id: v.string(),
            name: v.string(),
            html: v.string(),
        })),
        flows: v.optional(v.array(v.object({
            from: v.string(),
            to: v.string(),
            label: v.optional(v.string()),
        }))),
        previewImage: v.optional(v.string()),
        messages: v.optional(v.array(v.object({
            role: v.string(),
            content: v.optional(v.string()),
            thinkingContent: v.optional(v.string()),
            question: v.optional(v.any()),
            submittedAnswer: v.optional(v.any()),
            plannedScreens: v.optional(v.array(v.any())),
            isArchitectureApproved: v.optional(v.boolean()),
            designSteps: v.optional(v.array(v.object({
                id: v.string(),
                label: v.string(),
                status: v.string(),
            }))),
        }))),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("Not authenticated");
        }

        const now = Date.now();
        const previewHtml = args.screens.length > 0 ? args.screens[0].html : undefined;

        const projectId = await ctx.db.insert("projects", {
            userId,
            title: args.title,
            prompt: args.prompt,
            screens: args.screens,
            flows: args.flows,
            previewHtml,
            previewImage: args.previewImage,
            messages: args.messages,
            createdAt: now,
            updatedAt: now,
        });

        return { projectId };
    },
});


// Get all projects for the current user
export const getUserProjects = query({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            return [];
        }

        const projects = await ctx.db
            .query("projects")
            .withIndex("by_created", (q) => q.eq("userId", userId))
            .order("desc")
            .collect();

        return projects;
    },
});

// Get a single project by ID
export const getProject = query({
    args: {
        projectId: v.id("projects"),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            return null;
        }

        const project = await ctx.db.get(args.projectId);

        // Ensure user owns this project
        if (!project || project.userId !== userId) {
            return null;
        }

        return project;
    },
});

// Delete a project
export const deleteProject = mutation({
    args: {
        projectId: v.id("projects"),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("Not authenticated");
        }

        const project = await ctx.db.get(args.projectId);

        // Ensure user owns this project
        if (!project || project.userId !== userId) {
            throw new Error("Project not found or access denied");
        }

        await ctx.db.delete(args.projectId);

        return { success: true };
    },
});
