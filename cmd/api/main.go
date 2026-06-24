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

// @title           HRMS API
// @version         1.0
// @description     This is the core backend API.
// @termsOfService  http://swagger.io/terms/

// @contact.name   API Support
// @contact.email  support@example.com

// @host      localhost:4000
// @BasePath  /api

// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
func main() {
	cfg := config.LoadConfig()
	defer cfg.DB.Close()

	userRepo := repository.NewUserRepository(cfg.DB)
	taskRepo := repository.NewTaskRepository(cfg.DB)
	projectRepo := repository.NewProjectRepository(cfg.DB)
	attendanceRepo := repository.NewAttendanceRepository(cfg.DB)
	leaveRepo := repository.NewLeaveRepository(cfg.DB)
	notificationRepo := repository.NewNotificationRepository(cfg.DB)

	notificationService := service.NewNotificationService(notificationRepo)
	authService := service.NewAuthService(userRepo, cfg.JWTSecret)
	userService := service.NewUserService(userRepo)
	taskService := service.NewTaskService(taskRepo, notificationService)
	projectService := service.NewProjectService(projectRepo)
	attendanceService := service.NewAttendanceService(attendanceRepo)
	leaveService := service.NewLeaveService(leaveRepo, notificationService, userRepo)
	StorageService := service.NewSupabaseStorageService(cfg.SupabaseURL, cfg.SupabaseKey, cfg.BucketName)

	err := authService.SeedAdmin(context.Background(), cfg.AdminEmail, cfg.AdminPassword)
	if err != nil {
		log.Fatalf("Failed to seed admin: %v", err)
	}

	appHandlers := router.Handlers{
		Auth:         handler.NewAuthHandler(authService),
		User:         handler.NewUserHandler(userService),
		Task:         handler.NewTaskHandler(taskService),
		Project:      handler.NewProjectHandler(projectService),
		Attendance:   handler.NewAttendanceHandler(attendanceService),
		Leave:        handler.NewLeaveHandler(leaveService),
		Notification: handler.NewNotificationHandler(notificationService),
		Storage:      handler.NewStorageHandler(StorageService),
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
