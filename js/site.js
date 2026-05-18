(function () {
    var body = document.body;
    var pageName = (location.pathname.split("/").pop() || "index.html").toLowerCase();

    function markCurrentNav() {
        var links = document.querySelectorAll(".float a[href]");
        for (var i = 0; i < links.length; i += 1) {
            var link = links[i];
            var href = (link.getAttribute("href") || "").toLowerCase();
            if (href === pageName) {
                link.classList.add("nav-current");
                link.setAttribute("aria-current", "page");
            }
        }
    }

    function setupBackToTop() {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "backtop";
        btn.textContent = "顶部";
        body.appendChild(btn);

        function sync() {
            if (window.scrollY > 380) {
                btn.classList.add("show");
            } else {
                btn.classList.remove("show");
            }
        }

        btn.addEventListener("click", function () {
            window.scrollTo({ top: 0, behavior: "smooth" });
        });

        window.addEventListener("scroll", sync, { passive: true });
        sync();
    }

    function setupScheduleEnhancements() {
        var table = document.querySelector(".page-schedule-content table");
        if (!table) {
            return;
        }

        var shell = table.closest(".schedule-shell");
        var scroll = table.closest(".schedule-scroll");

        if (!shell || !scroll) {
            shell = document.createElement("div");
            shell.className = "schedule-shell";
            scroll = document.createElement("div");
            scroll.className = "schedule-scroll";

            table.parentNode.insertBefore(shell, table);
            shell.appendChild(scroll);
            scroll.appendChild(table);
        }

        var dragging = false;
        var startX = 0;
        var startLeft = 0;

        scroll.addEventListener("pointerdown", function (event) {
            dragging = true;
            startX = event.clientX;
            startLeft = scroll.scrollLeft;
            scroll.classList.add("dragging");
            scroll.setPointerCapture(event.pointerId);
        });

        scroll.addEventListener("pointermove", function (event) {
            if (!dragging) {
                return;
            }
            var deltaX = event.clientX - startX;
            scroll.scrollLeft = startLeft - deltaX;
        });

        function stopDrag(event) {
            if (!dragging) {
                return;
            }
            dragging = false;
            scroll.classList.remove("dragging");
            if (event && scroll.hasPointerCapture(event.pointerId)) {
                scroll.releasePointerCapture(event.pointerId);
            }
        }

        scroll.addEventListener("pointerup", stopDrag);
        scroll.addEventListener("pointercancel", stopDrag);
        scroll.addEventListener("pointerleave", stopDrag);

        var headers = Array.from(table.rows[0].cells).slice(1).map(function (cell) {
            return cell.textContent.trim();
        });
        var lessonsByDay = headers.map(function () { return []; });
        var pendingSpans = [0, 0, 0, 0, 0, 0];
        var rows = Array.from(table.rows).slice(1);

        for (var r = 0; r < rows.length; r += 1) {
            var row = rows[r];
            var first = row.cells[0];
            if (first && first.getAttribute("colspan") === "6") {
                continue;
            }

            var time = first ? first.textContent.trim() : "";
            var col = 0;

            for (var c = 0; c < row.cells.length; c += 1) {
                while (col < pendingSpans.length && pendingSpans[col] > 0) {
                    pendingSpans[col] -= 1;
                    col += 1;
                }

                var cell = row.cells[c];
                var rowspan = parseInt(cell.getAttribute("rowspan") || "1", 10);
                var colspan = parseInt(cell.getAttribute("colspan") || "1", 10);
                var text = cell.textContent.replace(/\s+/g, " ").trim();

                if (col > 0 && text) {
                    var dayIndex = col - 1;
                    if (dayIndex >= 0 && dayIndex < lessonsByDay.length) {
                        var titleEl = cell.querySelector("[class^='course']");
                        var title = titleEl ? titleEl.textContent.trim() : text;
                        var detail = text.replace(title, "").trim();
                        lessonsByDay[dayIndex].push({
                            time: time || "时间未标注",
                            title: title,
                            detail: detail,
                            blocks: rowspan
                        });
                    }
                }

                for (var span = 0; span < colspan; span += 1) {
                    if (rowspan > 1 && (col + span) < pendingSpans.length) {
                        pendingSpans[col + span] = rowspan - 1;
                    }
                }

                col += colspan;
            }
        }

        var controls = document.createElement("div");
        controls.className = "schedule-day-controls";
        var panel = document.createElement("div");
        panel.className = "schedule-day-panel";
        panel.hidden = true;

        function buildDayPanel(dayIdx) {
            panel.innerHTML = "";
            var title = document.createElement("h3");
            title.className = "schedule-day-title";
            title.textContent = headers[dayIdx];
            panel.appendChild(title);

            var list = document.createElement("div");
            list.className = "schedule-day-list";
            var data = lessonsByDay[dayIdx];

            if (!data.length) {
                var empty = document.createElement("p");
                empty.className = "schedule-day-empty";
                empty.textContent = "这一天没有课程安排。";
                list.appendChild(empty);
            } else {
                for (var i = 0; i < data.length; i += 1) {
                    var item = data[i];
                    var card = document.createElement("article");
                    card.className = "schedule-day-item";
                    card.innerHTML =
                        "<div class=\"time\">" + item.time + "</div>" +
                        "<div class=\"name\">" + item.title + "</div>" +
                        "<div class=\"meta\">" + (item.detail || "课程信息见原课表") + "</div>" +
                        "<div class=\"blocks\">" + item.blocks + " 节</div>";
                    list.appendChild(card);
                }
            }

            panel.appendChild(list);
        }

        function setMode(mode, dayIdx) {
            var buttons = controls.querySelectorAll("button");
            for (var i = 0; i < buttons.length; i += 1) {
                buttons[i].classList.remove("active");
            }

            if (mode === "all") {
                controls.querySelector("[data-mode='all']").classList.add("active");
                shell.hidden = false;
                panel.hidden = true;
            } else {
                controls.querySelector("[data-day='" + dayIdx + "']").classList.add("active");
                shell.hidden = true;
                panel.hidden = false;
                buildDayPanel(dayIdx);
            }
        }

        var allBtn = document.createElement("button");
        allBtn.type = "button";
        allBtn.dataset.mode = "all";
        allBtn.textContent = "全部";
        allBtn.addEventListener("click", function () {
            setMode("all");
        });
        controls.appendChild(allBtn);

        for (var h = 0; h < headers.length; h += 1) {
            (function (dayIdx) {
                var btn = document.createElement("button");
                btn.type = "button";
                btn.dataset.day = String(dayIdx);
                btn.textContent = headers[dayIdx];
                btn.addEventListener("click", function () {
                    setMode("day", dayIdx);
                });
                controls.appendChild(btn);
            }(h));
        }

        shell.parentNode.insertBefore(controls, shell);
        shell.parentNode.insertBefore(panel, shell.nextSibling);
        setMode("all");
    }

    function setupPhotoLightbox() {
        var images = document.querySelectorAll(".div1 img");
        var zoomable = [];
        for (var i = 0; i < images.length; i += 1) {
            var img = images[i];
            if (img.getAttribute("width") === "50") {
                continue;
            }
            zoomable.push(img);
        }

        if (!zoomable.length) {
            return;
        }

        var lightbox = document.createElement("div");
        lightbox.className = "lightbox";
        var preview = document.createElement("img");
        preview.alt = "";
        lightbox.appendChild(preview);
        body.appendChild(lightbox);

        function openLightbox(source) {
            preview.src = source.currentSrc || source.src;
            preview.alt = source.alt || "";
            lightbox.classList.add("open");
        }

        function closeLightbox() {
            lightbox.classList.remove("open");
        }

        for (var j = 0; j < zoomable.length; j += 1) {
            zoomable[j].style.cursor = "zoom-in";
            zoomable[j].addEventListener("click", function (event) {
                openLightbox(event.currentTarget);
            });
        }

        lightbox.addEventListener("click", closeLightbox);
        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape") {
                closeLightbox();
            }
        });
    }

    function setupQuestionForm() {
        var form = document.querySelector(".page-question-content form");
        if (!form) {
            return;
        }

        var key = "draft:" + pageName;
        var fields = form.querySelectorAll("input, select, textarea");
        var status = document.createElement("p");
        status.className = "question-status";
        status.textContent = "内容会自动保存为草稿。";
        form.appendChild(status);

        function collect() {
            var values = {};
            for (var i = 0; i < fields.length; i += 1) {
                var field = fields[i];
                if (!field.name) {
                    continue;
                }

                if (field.type === "checkbox") {
                    if (!values[field.name]) {
                        values[field.name] = [];
                    }
                    if (field.checked) {
                        values[field.name].push(field.value);
                    }
                    continue;
                }

                if (field.type === "radio") {
                    if (field.checked) {
                        values[field.name] = field.value;
                    }
                    continue;
                }

                values[field.name] = field.value;
            }
            return values;
        }

        function restore() {
            var raw = localStorage.getItem(key);
            if (!raw) {
                return;
            }

            var data = null;
            try {
                data = JSON.parse(raw);
            } catch (error) {
                localStorage.removeItem(key);
                return;
            }

            for (var i = 0; i < fields.length; i += 1) {
                var field = fields[i];
                var value = data[field.name];
                if (value === undefined) {
                    continue;
                }

                if (field.type === "checkbox") {
                    field.checked = Array.isArray(value) && value.indexOf(field.value) !== -1;
                    continue;
                }

                if (field.type === "radio") {
                    field.checked = value === field.value;
                    continue;
                }

                field.value = value;
            }
        }

        function saveDraft() {
            localStorage.setItem(key, JSON.stringify(collect()));
        }

        function ensureError(field) {
            var id = field.name + "-error";
            var exist = form.querySelector("[data-error='" + id + "']");
            if (exist) {
                return exist;
            }
            var msg = document.createElement("span");
            msg.className = "field-error";
            msg.dataset.error = id;
            field.insertAdjacentElement("afterend", msg);
            return msg;
        }

        function setError(field, message) {
            var msg = ensureError(field);
            msg.textContent = message || "";
            if (message) {
                field.classList.add("is-invalid");
            } else {
                field.classList.remove("is-invalid");
            }
        }

        function validateField(field) {
            if (!field || !field.name) {
                return true;
            }

            var value = (field.value || "").trim();

            if (field.name === "username") {
                if (value.length < 2) {
                    setError(field, "姓名至少 2 个字符。");
                    return false;
                }
                setError(field, "");
                return true;
            }

            if (field.name === "phone" && value) {
                if (!/^1\d{10}$/.test(value)) {
                    setError(field, "手机号格式应为 11 位数字。");
                    return false;
                }
                setError(field, "");
                return true;
            }

            if (field.name === "email" && value) {
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                    setError(field, "邮箱格式不正确。");
                    return false;
                }
                setError(field, "");
                return true;
            }

            if (field.name === "city") {
                if ((field.value || "") === "1") {
                    setError(field, "请选择所在城市。");
                    return false;
                }
                setError(field, "");
                return true;
            }

            return true;
        }

        function validateAll() {
            var required = [
                form.querySelector("[name='username']"),
                form.querySelector("[name='phone']"),
                form.querySelector("[name='email']"),
                form.querySelector("[name='city']")
            ];

            var ok = true;
            var firstInvalid = null;
            for (var i = 0; i < required.length; i += 1) {
                if (!required[i]) {
                    continue;
                }
                var valid = validateField(required[i]);
                if (!valid && !firstInvalid) {
                    firstInvalid = required[i];
                    ok = false;
                }
            }

            if (!ok && firstInvalid) {
                firstInvalid.focus();
            }

            return ok;
        }

        for (var i = 0; i < fields.length; i += 1) {
            fields[i].addEventListener("input", function (event) {
                validateField(event.target);
                saveDraft();
                status.textContent = "草稿已保存。";
            });
            fields[i].addEventListener("change", function (event) {
                validateField(event.target);
                saveDraft();
                status.textContent = "草稿已保存。";
            });
        }

        form.addEventListener("submit", function (event) {
            if (!validateAll()) {
                event.preventDefault();
                status.textContent = "请先修正标红字段。";
                return;
            }
            status.textContent = "表单校验通过，可以提交。";
        });

        form.addEventListener("reset", function () {
            setTimeout(function () {
                localStorage.removeItem(key);
                var errors = form.querySelectorAll(".field-error");
                for (var i = 0; i < errors.length; i += 1) {
                    errors[i].textContent = "";
                }
                var invalids = form.querySelectorAll(".is-invalid");
                for (var j = 0; j < invalids.length; j += 1) {
                    invalids[j].classList.remove("is-invalid");
                }
                status.textContent = "草稿已清空。";
            }, 0);
        });

        restore();
    }

    markCurrentNav();
    setupBackToTop();
    setupScheduleEnhancements();
    setupPhotoLightbox();
    setupQuestionForm();
}());
