package router

import (
	"net/http"

	"github.com/justinas/alice"
	"github.com/kyzercmd/cadence/internal/handler"
	"github.com/kyzercmd/cadence/internal/middleware"
)

type Handlers struct {
	Auth *handler.AuthHandler
	User *handler.UserHandler
	Task *handler.TaskHandler
}

type Middlewares struct {
	Auth *middleware.AuthMiddleware
}

func SetupRoutes(h Handlers, m Middlewares) *http.ServeMux {
	mux := http.NewServeMux()

	mapAuthRoutes(mux, h, m)
	mapUserRoutes(mux, h, m)

	return mux
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
	mux.Handle("POST /api/projects/{id}/tasks", protectedChain.ThenFunc(h.Task.CreateTask))

	mux.Handle("PATCH /api/users/me", protectedChain.ThenFunc(h.User.UpdateSelf))
	mux.Handle("PATCH /api/users/{id}", HRChain.ThenFunc(h.User.HRUpdateEmployee))
	mux.Handle("PATCH /api/admin/users/{id}", AdminChain.ThenFunc(h.User.AdminUpdateEmployee))

	mux.Handle("GET /api/users/me", protectedChain.ThenFunc(h.User.GetSelf))
	mux.Handle("GET /api/users/{id}", HRChain.ThenFunc(h.User.GetEmployee))
	mux.Handle("GET /api/users/me/tasks", protectedChain.ThenFunc(h.Task.GetMyTasks))

}
