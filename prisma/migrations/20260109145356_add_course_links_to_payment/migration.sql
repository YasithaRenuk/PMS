-- AlterTable
ALTER TABLE `Payment` ADD COLUMN `courseFeeId` INTEGER NULL,
    ADD COLUMN `courseId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `Course`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_courseFeeId_fkey` FOREIGN KEY (`courseFeeId`) REFERENCES `CourseFee`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
