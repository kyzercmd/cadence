package router

import (
	"net/http"

	"github.com/kyzercmd/cadence/internal/handler"
	"github.com/kyzercmd/cadence/internal/middleware"
)

type Handlers struct {
	Auth *handler.AuthHandler
}

type Middlewares struct {
	Auth *middleware.AuthMiddleware
}

func SetupRoutes(h Handlers, m Middlewares) *http.ServeMux {
	mux := http.NewServeMux()

	mapAuthRoutes(mux, h, m)

	return mux
}

func mapAuthRoutes(mux *http.ServeMux, h Handlers, m Middlewares) {
	mux.HandleFunc("/api/auth/login", h.Auth.Login)
}
