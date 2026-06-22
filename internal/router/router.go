package router

import (
	"net/http"

	"github.com/justinas/alice"
	"github.com/kyzercmd/cadence/internal/handler"
	"github.com/kyzercmd/cadence/internal/middleware"
	"github.com/rs/cors"
)

type Handlers struct {
	Auth    *handler.AuthHandler
	User    *handler.UserHandler
	Task    *handler.TaskHandler
	Project *handler.ProjectHandler
}

type Middlewares struct {
	Auth *middleware.AuthMiddleware
}

func SetupRoutes(h Handlers, m Middlewares) http.Handler {
	mux := http.NewServeMux()

	mapAuthRoutes(mux, h, m)
	mapUserRoutes(mux, h, m)

	c := cors.New(cors.Options{
		AllowOriginFunc:  func(origin string) bool { return true },
		AllowedMethods:   []string{http.MethodGet, http.MethodPost, http.MethodPatch, http.MethodPut, http.MethodDelete, http.MethodOptions},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		AllowCredentials: true,
		Debug:            true,
	})

	handler := c.Handler(mux)

	return handler
}

func mapAuthRoutes(mux *http.ServeMux, h Handlers, m Middlewares) {
	mux.HandleFunc("POST /api/auth/login", h.Auth.Login)
	mux.HandleFunc("POST /api/auth/refresh", h.Auth.Refresh)
}

func mapUserRoutes(mux *http.ServeMux, h Handlers, m Middlewares) {
	protectedChain := alice.New(m.Auth.RequireAuth)
	HRChain := protectedChain.Append(middleware.RequireRole("hr", "admin"))
	AdminChain := protectedChain.Append(middleware.RequireRole("admin"))

	mux.Handle("POST /api/admin/employee", AdminChain.ThenFunc(h.User.CreateEmployee))
	mux.Handle("POST /api/projects/{projectid}/tasks", protectedChain.ThenFunc(h.Task.CreateTask))
	mux.Handle("POST /api/projects", HRChain.ThenFunc(h.Project.CreateProject))

	mux.Handle("PATCH /api/users/me", protectedChain.ThenFunc(h.User.UpdateSelf))
	mux.Handle("PATCH /api/users/{id}", HRChain.ThenFunc(h.User.HRUpdateEmployee))
	mux.Handle("PATCH /api/admin/users/{id}", AdminChain.ThenFunc(h.User.AdminUpdateEmployee))
	mux.Handle("PATCH /api/tasks/{taskid}/status", protectedChain.ThenFunc(h.Task.UpdateTaskStatus))
	mux.Handle("PATCH /api/tasks/{taskid}/time", protectedChain.ThenFunc(h.Task.LogTime))

	mux.Handle("PUT /api/tasks/{taskid}", protectedChain.ThenFunc(h.Task.UpdateTask))

	mux.Handle("GET /api/users/me", protectedChain.ThenFunc(h.User.GetSelf))
	mux.Handle("GET /api/users/{id}", HRChain.ThenFunc(h.User.GetEmployee))
	mux.Handle("GET /api/users/me/tasks", protectedChain.ThenFunc(h.Task.GetMyTasks))
	mux.Handle("GET /api/projects/{projectid}/tasks", protectedChain.ThenFunc(h.Task.GetProjectTasks))
	mux.Handle("GET /api/tasks/{taskid}", protectedChain.ThenFunc(h.Task.GetTaskDetails))
	mux.Handle("GET /api/projects", protectedChain.ThenFunc(h.Project.GetProjects))

}
