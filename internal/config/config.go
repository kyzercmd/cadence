package config

import (
	"context"
	"log"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

type Config struct {
	Port          string
	DB            *pgxpool.Pool
	JWTSecret     string
	AdminEmail    string
	AdminPassword string
	SupabaseURL   string
	SupabaseKey   string
	BucketName    string
}

func LoadConfig() *Config {
	_ = godotenv.Load()

	dsn := os.Getenv("DB_DSN")
	if dsn == "" {
		log.Fatal("DB DSN is required")
	}

	ctx := context.Background()

	poolConfig, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		log.Fatalf("Failed to parse database dsn: %v", err)
	}

	poolConfig.MaxConns = 25
	poolConfig.MinConns = 25
	poolConfig.MaxConnLifetime = 15 * time.Minute
	poolConfig.MaxConnIdleTime = 5 * time.Minute

	pool, err := pgxpool.NewWithConfig(ctx, poolConfig)
	if err != nil {
		log.Fatalf("Failed to create connection pool: %v", err)
	}

	if err = pool.Ping(ctx); err != nil {
		log.Fatalf("Failed to ping database %v", err)
	}

	return &Config{
		Port:          os.Getenv("PORT"),
		DB:            pool,
		JWTSecret:     os.Getenv("JWTSecret"),
		AdminEmail:    os.Getenv("ADMIN_EMAIL"),
		AdminPassword: os.Getenv("ADMIN_PASSWORD"),
		SupabaseURL:   os.Getenv("SUPABASE_URL"),
		SupabaseKey:   os.Getenv("SUPABASE_KEY"),
		BucketName:    os.Getenv("BUCKET_NAME"),
	}
}
