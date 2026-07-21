package main

import (
	"context"
	"fmt"
	"log"
	"math/rand/v2"
	"time"

	"github.com/brianvoe/gofakeit/v7"

	"github.com/google/uuid"
	"github.com/kyzercmd/cadence/internal/config"
)

var numUsers = 20
var numProjects = 10

var (
	roles         = []string{"admin", "hr", "employee"}
	levels        = []string{"Junior", "Middle", "Senior"}
	genders       = []string{"Male", "Female"}
	projectStatus = []string{"active", "completed"}
	priorities    = []string{"low", "medium", "high"}
	taskStatuses  = []string{"todo", "in_progress", "in_review", "done"}
	leaveTypes    = []string{"vacation", "sick", "remote"}
	leaveStatuses = []string{"pending", "approved", "rejected"}
)

func main() {
	cfg := config.LoadConfig()
	defer cfg.DB.Close()

	gofakeit.Seed(0)
	ctx := context.Background()
	tx, err := cfg.DB.Begin(ctx)
	if err != nil {
		log.Fatalf("Failed to create transaction: %v", err)
	}
	defer tx.Rollback(ctx)

	fmt.Println("Starting database seeding...")
	userIDs := make([]uuid.UUID, numUsers)
	for i := range numUsers {
		userIDs[i] = uuid.New()
		_, err := tx.Exec(ctx, `INSERT INTO users (id, name, email, password_hash, role, position, level, gender, birthday, company, location, mobile, skype)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`, userIDs[i], gofakeit.Name(), gofakeit.Email(), gofakeit.Password(true, true, true, true, false, 10), roles[gofakeit.Number(0, 2)], gofakeit.JobTitle(), levels[gofakeit.Number(0, 2)], genders[gofakeit.Number(0, 1)],
			gofakeit.DateRange(time.Now().AddDate(-50, 0, 0), time.Now().AddDate(-20, 0, 0)), gofakeit.Company(), gofakeit.City(), gofakeit.Phone(), gofakeit.Username())
		if err != nil {
			log.Fatalf("Failed to insert users %v", err)
		}
	}
	fmt.Printf("Inserted %d users.\n", numUsers)

	projectIDs := make([]uuid.UUID, numProjects)
	for i := range projectIDs {
		projectIDs[i] = uuid.New()
		_, err := tx.Exec(ctx, `INSERT INTO projects (id, code, name, description, status, priority, start_date, deadline) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, projectIDs[i], fmt.Sprintf("PN-%d", gofakeit.Number(10000, 99999)), gofakeit.AppName(), gofakeit.Sentence(10), projectStatus[gofakeit.Number(0, 1)], priorities[gofakeit.Number(0, 2)], gofakeit.DateRange(time.Now().AddDate(0, -1, 0), time.Now()), gofakeit.DateRange(time.Now(), time.Now().AddDate(0, 1, 0)))
		if err != nil {
			log.Fatalf("Error inserting projects %v", err)
		}
	}
	fmt.Printf("Inserted %v projects.\n", numProjects)

	for _, pID := range projectIDs {
		for range 4 {
			uID := userIDs[gofakeit.Number(0, numUsers-1)]
			_, err := tx.Exec(ctx, `INSERT INTO project_members (project_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, pID, uID)
			if err != nil {
				log.Fatalf("Failed to insert project members: %v", err)
			}
		}

		for range 5 {
			tID := uuid.New()
			_, err := tx.Exec(ctx, `INSERT INTO tasks (id, project_id, name, description, status, priority, estimate_hours, due_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, tID, pID, gofakeit.VerbAction(), gofakeit.Sentence(10), taskStatuses[gofakeit.Number(0, 3)], priorities[gofakeit.Number(0, 2)], gofakeit.Number(1, 30), gofakeit.DateRange(time.Now().AddDate(0, 0, -7), time.Now().AddDate(0, 0, 14)))
			if err != nil {
				log.Fatalf("Failed to insert tasks: %v", err)
			}

			assigneeID := userIDs[gofakeit.Number(0, numUsers-1)]
			_, err = tx.Exec(ctx, `INSERT INTO task_assignees (task_id, user_id, spent_hours) VALUES ($1, $2, $3)`, tID, assigneeID, gofakeit.Number(0, 10))
			if err != nil {
				log.Fatalf("Failed to insert task assignees: %v", err)
			}
		}
	}
	fmt.Println("Inserted project members, tasks, task assignees")

	for _, uID := range userIDs {
		clockIn := time.Now().Add(-8 * time.Hour)
		clockOut := time.Now()
		_, err := tx.Exec(ctx, `INSERT INTO attendance_entries (user_id, date, clock_in, clock_out, total_minutes) VALUES ($1, $2, $3, $4, $5)`, uID, time.Now(), clockIn, clockOut, gofakeit.Number(300, 600))
		if err != nil {
			log.Fatalf("Failed to insert attendance_entries: %v", err)
		}

		if rand.IntN(5) > 4 {
			_, err := tx.Exec(ctx, `INSERT INTO leave_requests (user_id, type, start_date, end_date, reason, status)
			VALUES ($1, $2, $3, $4, $5, $6)`, uID, leaveTypes[gofakeit.Number(0, 2)], time.Now().AddDate(0, 0, 1), time.Now().AddDate(0, 0, 5), gofakeit.Sentence(12), leaveStatuses[gofakeit.Number(0, 2)])
			if err != nil {
				log.Fatalf("Failed to insert leave requests: %v", err)
			}
		}
	}
	fmt.Println("Inserted attendance entries and leave requests")

	if err := tx.Commit(ctx); err != nil {
		log.Fatalf("Transaction commit failed: %v", err)
	}

	fmt.Println("Database seeded successfully.")
}
