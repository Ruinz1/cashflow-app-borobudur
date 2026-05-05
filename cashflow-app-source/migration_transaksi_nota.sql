-- ============================================================
-- Migrasi: Tabel transaksi_nota (multiple nota per transaksi)
-- Jalankan sekali via phpMyAdmin → Import, atau terminal:
--   mysql -u root -p cashflow_perusahaan < migration_transaksi_nota.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS `transaksi_nota` (
  `id`           INT             NOT NULL AUTO_INCREMENT,
  `transaksi_id` INT             NOT NULL,
  `nama_file`    VARCHAR(255)    NOT NULL,
  `tipe_file`    VARCHAR(100)    NOT NULL DEFAULT '',
  `data_base64`  LONGTEXT,
  `urutan`       TINYINT         NOT NULL DEFAULT 1,
  `created_at`   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_transaksi_nota_tx` (`transaksi_id`),
  CONSTRAINT `fk_transaksi_nota_tx`
    FOREIGN KEY (`transaksi_id`)
    REFERENCES `transaksi_cashflow` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
