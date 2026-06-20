package main

import (
	"context"
	"fmt"
	"log"
	"net/http"

	"github.com/kyzercmd/cadence/internal/config"
	"github.com/kyzercmd/cadence/internal/handler"
	"github.com/kyzercmd/cadence/internal/middleware"
	"github.com/kyzercmd/cadence/internal/repository"
	"github.com/kyzercmd/cadence/internal/router"
	"github.com/kyzercmd/cadence/internal/service"
)

func main() {
	cfg := config.LoadConfig()
	defer cfg.DB.Close()

	userRepo := repository.NewUserRepository(cfg.DB)
	taskRepo := repository.NewTaskRepository(cfg.DB)

	authService := service.NewAuthService(userRepo, cfg.JWTSecret)
	userService := service.NewUserService(userRepo)
	taskService := service.NewTaskService(taskRepo)

	err := authService.SeedAdmin(context.Background(), cfg.AdminEmail, cfg.AdminPassword)
	if err != nil {
		log.Fatalf("Failed to seed admin: %v", err)
	}

	appHandlers := router.Handlers{
		Auth: handler.NewAuthHandler(authService),
		User: handler.NewUserHandler(userService),
		Task: handler.NewTaskHandler(taskService),
	}

	appMws := router.Middlewares{
		Auth: middleware.NewAuthMiddleware(cfg.JWTSecret),
	}

	mux := router.SetupRoutes(appHandlers, appMws)

	port := cfg.Port
	if port == "" {
		port = "4000"
	}

	log.Printf("Starting server on port: %v", port)
	err = http.ListenAndServe(fmt.Sprintf(":%v", port), mux)
	if err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
