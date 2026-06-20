package config

import (
	"database/sql"
	"log"
	"os"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/joho/godotenv"
)

type Config struct {
	Port          string
	DB            *sql.DB
	JWTSecret     string
	AdminEmail    string
	AdminPassword string
}

func LoadConfig() *Config {
	_ = godotenv.Load()

	dsn := os.Getenv("DB_DSN")
	if dsn == "" {
		log.Fatal("DB DSN is required")
	}

	db, err := sql.Open("pgx", dsn)
	if err != nil {
		log.Fatal("Failed to open database %w", err)
	}

	if err = db.Ping(); err != nil {
		log.Fatal("Failed to ping database %w", err)
	}

	return &Config{
		Port:          os.Getenv("PORT"),
		DB:            db,
		JWTSecret:     os.Getenv("JWTSecret"),
		AdminEmail:    os.Getenv("ADMIN_EMAIL"),
		AdminPassword: os.Getenv("ADMIN_PASSWORD"),
	}
}
