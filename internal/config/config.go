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
	R2AccountID   string
	R2AccessKey   string
	R2SecretKey   string
	R2BucketName  string
	R2PublicURL   string
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

	for i := range 5 {
		err := pool.Ping(ctx)
		if err == nil {
			break
		}
		log.Printf("Waiting for database.. Attempt: %d/5", i+1)

		if i == 4 {
			log.Fatalf("Failed to ping database %v", err)
		}
		time.Sleep(3 * time.Second)
	}

	return &Config{
		Port:          os.Getenv("PORT"),
		DB:            pool,
		JWTSecret:     os.Getenv("JWT_SECRET"),
		AdminEmail:    os.Getenv("ADMIN_EMAIL"),
		AdminPassword: os.Getenv("ADMIN_PASSWORD"),
		R2AccountID:   os.Getenv("R2_ACCOUNT_ID"),
		R2AccessKey:   os.Getenv("R2_ACCESS_KEY"),
		R2SecretKey:   os.Getenv("R2_SECRET_KEY"),
		R2BucketName:  os.Getenv("R2_BUCKET_NAME"),
		R2PublicURL:   os.Getenv("R2_PUBLIC_URL"),
	}
}
