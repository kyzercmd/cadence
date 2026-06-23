package models

import "errors"

//Auth and Employee/User related errors
var (
	ErrUserNotFound            = errors.New("User not found")
	ErrInvalidCredentials      = errors.New("Invalid Email or Password")
	ErrUserDeactivated         = errors.New("User account is deactivated")
	ErrInvalidRefreshToken     = errors.New("Refresh token is invalid")
	ErrInvalidMapClaims        = errors.New("Invalid Map claims")
	ErrInsufficientPermissions = errors.New("You do not have permission to perform this action")
)

//Task and Project related errors
var (
	ErrTaskNameRequired  = errors.New("Task name is required")
	ErrProjectNotFound   = errors.New("Project not found")
	ErrTaskNotFound      = errors.New("Task not found")
	ErrUserNotAssigned   = errors.New("User is not assigned to task")
	ErrHoursLessThanZero = errors.New("Logged hour must be greater than zero")
	ErrProjectCodeExists = errors.New("A project with this code already exists")
)

var (
	ErrAlreadyClockedIn  = errors.New("You have already clocked in for today")
	ErrHaveNotClockedIn  = errors.New("You have not clocked in for today")
	ErrAlreadyClockedOut = errors.New("You have already clocked out for today")
)
