# claude-jobs (tiếng Việt)

Chạy Claude Code theo lịch, không người giám sát, **không cần `ANTHROPIC_API_KEY`** — dùng chính CLI đã đăng nhập sẵn trên máy.

Một lệnh dựng đủ bộ: prompt, script runner đã xử lý sẵn các bẫy thường gặp, và một entry lịch thật (launchd, systemd hoặc cron).

```bash
npx claude-jobs init bao-cao-sang \
  --skill ./playbooks/bao-cao-sang.md \
  --at 09:30 \
  --notify 'echo "$CLAUDE_JOB_MESSAGE" | mail -s "bao cao sang" me@example.com'

npx claude-jobs run bao-cao-sang --dry-run   # xem đúng những gì sẽ chạy
npx claude-jobs install bao-cao-sang          # giao cho scheduler của OS
```

## Vì sao cần

Claude Code chạy trên máy của mình là cách dùng chính thức và không tương tác được hỗ trợ. Phần thiếu luôn là những thứ bao quanh lệnh gọi: scheduler khởi động với môi trường gần như rỗng, agent chạy không người xem thì không được phép dừng lại hỏi, và một phiên không ai theo dõi phải tự báo cáo kết quả.

Package này là lớp bao ngoài nhàm chán đó, để phần thú vị nằm lại trong prompt.

**Không thuộc phạm vi:** không proxy, không bán lại, không biến subscription thành API cho tool khác. Xem [../policy.md](../policy.md).

## Cài

```bash
npm install -g claude-jobs   # hoặc dùng thẳng npx claude-jobs
claude-jobs doctor           # kiểm tra binary, phiên đăng nhập, scheduler
```

Yêu cầu Node 18.17+, Claude Code đã cài và đã `claude auth login` **bằng đúng user sẽ chạy job**.

## Lệnh

| Lệnh | Tác dụng |
| --- | --- |
| `init <tên>` | Dựng prompt + runner + unit lịch |
| `list` | Danh sách job và job nào thật sự đã lên lịch |
| `run <tên> [--now\|--dry-run]` | Chạy tay; `--dry-run` in kế hoạch và prompt |
| `install` / `uninstall <tên>` | Đăng ký / gỡ khỏi launchd, systemd, cron |
| `logs <tên> [--lines N]` | Xem log |
| `status <tên>` | Lịch, đường dẫn, và summary gần nhất |
| `doctor` | Binary, đăng nhập, rò rỉ API key, scheduler |

## Những quyết định đã nằm sẵn trong runner

Đây là các chỗ dễ sai một lần rồi mất cả tuần để lần ra:

- **Khai môi trường tường minh.** Scheduler không nạp profile shell, nên `PATH`, `HOME` và đường dẫn tuyệt đối tới `claude` được ghi thẳng vào script.
- **Prompt chỉ là con trỏ.** Nó trỏ tới file skill/runbook thay vì chứa logic, nên đổi hành vi không phải đụng vào lịch.
- **Chạy headless thì phải nói rõ trong prompt.** Agent được dặn không bao giờ hỏi lại, việc cần người quyết thì ghi ra rồi làm tiếp phần còn lại.
- **`--permission-mode bypassPermissions`.** Phiên không người giám sát không thể duyệt tool call.
- **`--output-format stream-json --verbose`.** Log ra từng bước ngay khi xảy ra, thay vì dồn tới lúc kết thúc.
- **Kiểm tra tiền điều kiện trước khi tốn một phiên** bằng `--precheck`.
- **Giãn giờ ngẫu nhiên**, vừa tránh nhịp cố định từng giây vừa tách các job ra khỏi cùng một trần hạn mức.
- **Kênh trả kết quả tách khỏi log.** Agent ghi file summary ở bước cuối, runner đọc file đó gửi qua `--notify`; không có summary thì báo lỗi kèm exit code.
- **Trạng thái nằm trong file**, vì mỗi phiên là một process mới.

Giải thích đầy đủ: [../design.md](../design.md).

## Ngoài phạm vi một chiếc laptop

Cùng ý tưởng "dùng subscription thay API key" còn xuất hiện ở vài chỗ được hỗ trợ chính thức: GitHub Actions với `claude_code_oauth_token`, Agent SDK xác thực bằng account, và gateway chat thực thi turn qua CLI local. Ranh giới ở đâu: [../use-cases.md](../use-cases.md).

## Đóng góp

Rất hoan nghênh issue và PR — nhất là scheduler ngoài launchd/systemd/cron, công thức notifier, và prompt template đã sống sót qua thực tế chạy nền. Bắt đầu từ [../../CONTRIBUTING.md](../../CONTRIBUTING.md).

Nếu nó tiết kiệm cho bạn một buổi chiều, một ⭐ sẽ giúp người khác tìm thấy nó.
