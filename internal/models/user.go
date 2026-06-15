package models

type User struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Email     string `json:"email"`
	Password  string `json:"-"`
	AvatarURL string `json:"avatarUrl"`
	Role      Role   `json:"role"`
	Position  string `json:"position"`
	Level     Level  `json:"level"`
	Gender    Gender `json:"gender"`
	Birthday  string `json:"birthday"`
	Company   string `json:"company"`
	Location  string `json:"location"`
	Mobile    string `json:"mobile"`
	Skype     string `json:"skype"`
	Active    bool   `json:"active"`
}

type AuthSession struct {
	Token        string `json:"token"`
	RefreshToken string `json:"refreshToken"`
	User         User   `json:"user"`
}
