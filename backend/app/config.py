from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "Big Fish Small Fish API"
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/bigfish_smallfish"
    tinyfish_api_key: str | None = None
    tinyfish_base_url: str = "https://agent.tinyfish.ai/v1"
    tinyfish_discovery_concurrency: int = 3
    tinyfish_extraction_concurrency: int = 4
    tinyfish_per_domain_concurrency: int = 2
    tinyfish_poll_interval_seconds: float = 3.0
    tinyfish_max_poll_seconds: int = 300


settings = Settings()
