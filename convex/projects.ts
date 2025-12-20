import { mutation, query } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
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
        designSystemMarkdown: v.optional(v.string()),
        messages: v.optional(v.array(v.object({
            role: v.string(),
            content: v.optional(v.string()),
            thinkingContent: v.optional(v.string()),
            isThinkingComplete: v.optional(v.boolean()),
            isThinkingPaused: v.optional(v.boolean()),
            thinkingDuration: v.optional(v.number()),
            question: v.optional(v.any()),
            questionIndex: v.optional(v.number()),
            submittedAnswer: v.optional(v.any()),
            isPlanReady: v.optional(v.boolean()),
            plannedScreens: v.optional(v.array(v.any())),
            isArchitectureApproved: v.optional(v.boolean()),
            isDesignSystemReady: v.optional(v.boolean()),
            designSystemOptions: v.optional(v.any()),
            submittedDesignSystem: v.optional(v.any()),
            completionMessage: v.optional(v.string()),
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
            isPublic: true, // Default to public as requested
            previewHtml,
            previewImage: args.previewImage,
            designSystemMarkdown: args.designSystemMarkdown,
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

// Toggle project visibility
export const toggleProjectVisibility = mutation({
    args: {
        projectId: v.id("projects"),
        isPublic: v.boolean(),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("Not authenticated");
        }

        const project = await ctx.db.get(args.projectId);

        if (!project || project.userId !== userId) {
            throw new Error("Project not found or access denied");
        }

        await ctx.db.patch(args.projectId, {
            isPublic: args.isPublic,
        });

        return { success: true };
    },
});

// Update project title (for AI-generated names)
export const updateProjectTitle = mutation({
    args: {
        projectId: v.id("projects"),
        title: v.string(),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("Not authenticated");
        }

        const project = await ctx.db.get(args.projectId);

        if (!project || project.userId !== userId) {
            throw new Error("Project not found or access denied");
        }

        await ctx.db.patch(args.projectId, {
            title: args.title,
            updatedAt: Date.now(),
        });

        return { success: true };
    },
});

// Update a specific screen's HTML (for LLM Patch Mode editing)
export const updateScreenHtml = mutation({
    args: {
        projectId: v.id("projects"),
        screenId: v.string(),
        html: v.string(),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("Not authenticated");
        }

        const project = await ctx.db.get(args.projectId);

        if (!project || project.userId !== userId) {
            throw new Error("Project not found or access denied");
        }

        // Find and update the specific screen
        const screenIndex = project.screens.findIndex(s => s.id === args.screenId);
        if (screenIndex === -1) {
            throw new Error("Screen not found");
        }

        const updatedScreens = project.screens.map(screen =>
            screen.id === args.screenId
                ? { ...screen, html: args.html }
                : screen
        );

        // Also update previewHtml if this is the first screen
        const previewHtml = screenIndex === 0 ? args.html : project.previewHtml;

        await ctx.db.patch(args.projectId, {
            screens: updatedScreens,
            previewHtml,
            updatedAt: Date.now(),
        });

        return { success: true };
    },
});

// Get public projects (showcase) - legacy, kept for backward compatibility
export const getPublicProjects = query({
    args: {
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const limit = args.limit || 20;

        const projects = await ctx.db
            .query("projects")
            .withIndex("by_public", (q) => q.eq("isPublic", true))
            .order("desc")
            .take(limit);

        // Enhance projects with user details
        const enhancedProjects = await Promise.all(
            projects.map(async (project) => {
                const user = await ctx.db.get(project.userId);
                return {
                    ...project,
                    authorName: user?.name?.split(" ")[0] || "Anonymous", // First name only
                };
            })
        );

        return enhancedProjects;
    },
});

// Get public projects with cursor-based pagination (showcase)
export const getPublicProjectsPaginated = query({
    args: {
        paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx, args) => {
        const results = await ctx.db
            .query("projects")
            .withIndex("by_public", (q) => q.eq("isPublic", true))
            .order("desc")
            .paginate(args.paginationOpts);

        // Enhance projects with user details
        const enhancedPage = await Promise.all(
            results.page.map(async (project) => {
                const user = await ctx.db.get(project.userId);
                return {
                    ...project,
                    authorName: user?.name?.split(" ")[0] || "Anonymous",
                };
            })
        );

        return {
            ...results,
            page: enhancedPage,
        };
    },
});
