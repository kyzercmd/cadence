package router

import (
	"net/http"

	"github.com/kyzercmd/cadence/internal/handler"
	"github.com/kyzercmd/cadence/internal/middleware"
	"github.com/kyzercmd/cadence/internal/models"
)

type Handlers struct {
	Auth *handler.AuthHandler
	User *handler.UserHandler
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
	mux.HandleFunc("/api/auth/login", h.Auth.Login)
	mux.HandleFunc("/api/auth/refresh", h.Auth.Refresh)
}

func mapUserRoutes(mux *http.ServeMux, h Handlers, m Middlewares) {
	createEmployeeChain := m.Auth.RequireAuth(middleware.RequireRole(models.RoleAdmin)(http.HandlerFunc(h.User.CreateEmployee)))
	mux.Handle("/api/employee", createEmployeeChain)
}
