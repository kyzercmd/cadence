package service

import (
	"context"
	"fmt"
	"mime/multipart"
	"path/filepath"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

type StorageService interface {
	UploadFile(ctx context.Context, file multipart.File, header *multipart.FileHeader) (string, error)
}

type r2StorageService struct {
	client     *s3.Client
	bucketName string
	publicURL  string
}

func NewR2StorageService(accountID, accessKey, secretKey, bucketName, publicURL string) (StorageService, error) {
	r2Endpoint := fmt.Sprintf("https://%s.r2.cloudflarestorage.com", accountID)

	cfg, err := config.LoadDefaultConfig(context.TODO(),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(accessKey, secretKey, "")),
		config.WithRegion("auto"))
	if err != nil {
		return nil, fmt.Errorf("Failed to load r2 config : %w", err)
	}

	client := s3.NewFromConfig(cfg, func(o *s3.Options) {
		o.BaseEndpoint = aws.String(r2Endpoint)
	})

	return &r2StorageService{
		client:     client,
		bucketName: bucketName,
		publicURL:  publicURL,
	}, nil
}

func (s *r2StorageService) UploadFile(ctx context.Context, file multipart.File, header *multipart.FileHeader) (string, error) {
	ext := filepath.Ext(header.Filename)
	uniqueFilename := fmt.Sprintf("%d%s", time.Now().UnixNano(), ext)

	contentType := header.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	_, err := s.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(s.bucketName),
		Key:         aws.String(uniqueFilename),
		Body:        file,
		ContentType: aws.String(contentType),
	})
	if err != nil {
		return "", fmt.Errorf("Failed to upload to R2: %w", err)
	}

	publicURL := fmt.Sprintf("%s/%s", s.publicURL, uniqueFilename)

	return publicURL, nil
}
