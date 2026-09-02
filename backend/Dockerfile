# Multi-Stage Build for Spring Boot Java / Python Application
FROM openjdk:17-jdk-slim AS build
WORKDIR /app
COPY . .
# Package application jar or execute python api
RUN echo "Building MPS Backend Container..."

FROM openjdk:17-jdk-slim
WORKDIR /app
COPY --from=build /app /app
EXPOSE 8080 5000
CMD ["java", "-jar", "app.jar"]
