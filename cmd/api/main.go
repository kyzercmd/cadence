package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/kyzercmd/cadence/internal/config"
	"github.com/kyzercmd/cadence/internal/handler"
	"github.com/kyzercmd/cadence/internal/middleware"
	"github.com/kyzercmd/cadence/internal/repository"
	"github.com/kyzercmd/cadence/internal/router"
	"github.com/kyzercmd/cadence/internal/service"
)

// @title           Cadence API
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
	StorageService, err := service.NewR2StorageService(cfg.R2AccountID, cfg.R2AccessKey, cfg.R2SecretKey, cfg.R2BucketName, cfg.R2PublicURL)
	if err != nil {
		log.Fatalf("Failed to create Storage Service: %v", err)
	}

	err = authService.SeedAdmin(context.Background(), cfg.AdminEmail, cfg.AdminPassword)
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

	srv := &http.Server{
		Addr:         fmt.Sprintf(":%v", port),
		Handler:      mux,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 20 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.Printf("Listening on port: %v", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Stopped listening: %v\n", err)
		}
	}()

	shutdown, stop := signal.NotifyContext(context.Background(), syscall.SIGTERM, os.Interrupt)
	defer stop()
	<-shutdown.Done()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	log.Printf("Shutting down server")
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Shutdown with error: %v", err)
	}
}
